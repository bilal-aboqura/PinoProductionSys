"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type BatchStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { recordBatchWasteLedger } from "@/features/inventory/actions";
import { buildTraceabilityUrl, generateBatchQrDataUrl } from "./qr";
import type { BatchActionResult, BatchErrorCode, LabelData } from "./types";
import {
  createBatchFromOrderSchema,
  disposeBatchSchema,
  maxEvidenceBytes,
  printLabelSchema,
  splitBatchSchema,
  updateBatchStatusSchema,
  validateEvidenceFile
} from "./validation";
import { calculateExpiryDate, generateBatchNumber, quantitiesMatchTotal } from "./utils";

const BATCH_EVIDENCE_BUCKET = "batch-evidence";

type Session = Awaited<ReturnType<typeof getServerSession>>;

function ok<T>(data: T): BatchActionResult<T> {
  return { success: true, data };
}

function fail(code: BatchErrorCode, message: string, details?: unknown): BatchActionResult<never> {
  return { success: false, error: { code, message, details } };
}

function validationFailure(error: { issues: { message: string }[] }) {
  return fail("VALIDATION", "Validation failed.", error.issues.map((issue) => issue.message));
}

function can(session: Session, permissions: string[]) {
  return permissions.some((permission) => session.user.permissions.includes(permission as never));
}

function requireAny(session: Session, permissions: string[]) {
  if (!can(session, permissions)) throw new Error("FORBIDDEN");
}

function actorName(session: Session) {
  return session.user.name ?? session.user.displayName ?? session.user.email ?? session.user.id;
}

function unknownError(error: unknown): BatchActionResult<never> {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "You must sign in to continue.");
    if (error.message === "FORBIDDEN" || error.message === "PERMISSION_DENIED") return fail("FORBIDDEN", "You do not have permission for this action.");
    if (error.message === "NOT_FOUND") return fail("NOT_FOUND", "Record not found.");
    if (error.message === "CONFLICT") return fail("CONFLICT", "This record has already been processed.");
    if (error.message === "INSUFFICIENT_STOCK") return fail("VALIDATION", "Requested quantity exceeds the available batch or inventory quantity.");
    if (error.message === "CONTAINER_TOTAL_MISMATCH") return fail("VALIDATION", "Container quantities must exactly match the batch quantity.");
    if (error.message === "ORDER_NOT_COMPLETED") return fail("VALIDATION", "The production order must be completed before creating a batch.");
    return fail("INTERNAL", error.message);
  }
  return fail("INTERNAL", "Unexpected batch error.");
}

function revalidateBatches() {
  revalidatePath("/[locale]/inventory/batches", "page");
  revalidatePath("/[locale]/inventory/batches/[batchNumber]", "page");
  revalidatePath("/[locale]/production/[id]", "page");
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

async function writeBatchAudit(
  tx: Prisma.TransactionClient,
  input: { batchId: string; actorId: string; actorName: string; action: string; previousValue?: unknown; newValue?: unknown }
) {
  await tx.batchAuditLog.create({
    data: {
      batchId: input.batchId,
      actorId: input.actorId,
      actorName: input.actorName,
      action: input.action,
      previousValue: input.previousValue == null ? Prisma.JsonNull : toJson(input.previousValue),
      newValue: input.newValue == null ? Prisma.JsonNull : toJson(input.newValue)
    }
  });
}

async function resolveFinishedProductItem(tx: Prisma.TransactionClient, recipeCode: string) {
  return tx.inventoryItem.findFirst({
    where: { code: recipeCode, itemType: "FINISHED_PRODUCT", isActive: true }
  });
}

async function lockedBalance(tx: Prisma.TransactionClient, warehouseId: string, inventoryItemId: string) {
  const balance = await tx.inventoryBalance.upsert({
    where: { warehouseId_inventoryItemId: { warehouseId, inventoryItemId } },
    update: {},
    create: { warehouseId, inventoryItemId }
  });
  await tx.$queryRaw`SELECT id FROM inventory_balances WHERE id = ${balance.id} FOR UPDATE`;
  return tx.inventoryBalance.findUniqueOrThrow({ where: { id: balance.id } });
}

async function adjustInventory(
  tx: Prisma.TransactionClient,
  input: {
    warehouseId: string;
    inventoryItemId: string;
    quantityDelta: Prisma.Decimal;
    userId: string;
    sourceRefId: string;
    movementType: "PRODUCTION_OUTPUT" | "WASTE";
    allowNegative?: boolean;
  }
) {
  const balance = await lockedBalance(tx, input.warehouseId, input.inventoryItemId);
  const currentQuantity = balance.currentQuantity.add(input.quantityDelta);
  if (!input.allowNegative && currentQuantity.lt(0)) throw new Error("INSUFFICIENT_STOCK");
  const availableQuantity = currentQuantity.sub(balance.reservedQuantity);
  await tx.inventoryBalance.update({
    where: { id: balance.id },
    data: { currentQuantity, availableQuantity, needsReconciliation: currentQuantity.lt(0) || balance.needsReconciliation }
  });
  await tx.stockMovement.create({
    data: {
      userId: input.userId,
      warehouseId: input.warehouseId,
      inventoryItemId: input.inventoryItemId,
      quantityDelta: input.quantityDelta,
      movementType: input.movementType,
      sourceRefId: input.sourceRefId
    }
  });
}

export async function createBatchForCompletedOrder(
  tx: Prisma.TransactionClient,
  input: { productionOrderId: string; warehouseId: string; containerQuantities?: number[]; actorId: string; actorName: string; locale?: string }
) {
  const order = await tx.productionOrder.findUnique({
    where: { id: input.productionOrderId },
    include: { recipe: true, recipeVersion: true, productionBatch: true }
  });
  if (!order) throw new Error("NOT_FOUND");
  if (order.productionBatch) return { batchId: order.productionBatch.id, batchNumber: order.productionBatch.batchNumber, alreadyExists: true };
  if (order.status !== "COMPLETED" || !order.producedQuantity || !order.completedAt) throw new Error("ORDER_NOT_COMPLETED");

  const warehouse = await tx.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true } });
  if (!warehouse) throw new Error("NOT_FOUND");
  if (input.containerQuantities?.length && !quantitiesMatchTotal(input.containerQuantities, order.producedQuantity)) {
    throw new Error("CONTAINER_TOTAL_MISMATCH");
  }

  const batchNumber = await generateBatchNumber(tx, order.completedAt);
  const expiryDate = calculateExpiryDate(order.completedAt, order.recipe.shelfLifeValue, order.recipe.shelfLifeUnit);
  const targetUrl = buildTraceabilityUrl(batchNumber, input.locale ?? "ar");
  const qrCodeData = await generateBatchQrDataUrl(targetUrl);
  const unit = order.recipe.yieldUnit;

  const batch = await tx.productionBatch.create({
    data: {
      batchNumber,
      recipeId: order.recipeId,
      recipeVersionId: order.recipeVersionId,
      productionOrderId: order.id,
      productionDate: order.completedAt,
      expiryDate,
      producedQuantity: order.producedQuantity,
      remainingQuantity: order.producedQuantity,
      unit,
      warehouseId: input.warehouseId,
      createdById: input.actorId,
      qrCode: { create: { qrCodeData, targetUrl } },
      statusHistory: { create: { fromStatus: null, toStatus: "ACTIVE", changedById: input.actorId, reason: "Batch created from completed production order." } }
    }
  });

  if (input.containerQuantities?.length) {
    await tx.batchContainer.createMany({
      data: input.containerQuantities.map((quantity, index) => ({
        batchId: batch.id,
        containerNumber: `${batchNumber}-C${index + 1}`,
        quantity: new Prisma.Decimal(quantity),
        remainingQuantity: new Prisma.Decimal(quantity),
        warehouseId: input.warehouseId
      }))
    });
  }

  const item = await resolveFinishedProductItem(tx, order.recipe.code);
  if (item) {
    await adjustInventory(tx, {
      warehouseId: input.warehouseId,
      inventoryItemId: item.id,
      quantityDelta: order.producedQuantity,
      userId: input.actorId,
      sourceRefId: batch.id,
      movementType: "PRODUCTION_OUTPUT",
      allowNegative: true
    });
    await tx.inventoryOutputLog.create({
      data: {
        productionOrderId: order.id,
        warehouseId: input.warehouseId,
        inventoryItemId: item.id,
        quantityProduced: order.producedQuantity
      }
    });
  }

  await tx.productionOrderDownstreamAction.upsert({
    where: { orderId_actionType: { orderId: order.id, actionType: "BATCH_RECORD" } },
    update: { referenceId: batch.batchNumber, triggeredById: input.actorId },
    create: { orderId: order.id, actionType: "BATCH_RECORD", referenceId: batch.batchNumber, triggeredById: input.actorId, payload: toJson({ batchId: batch.id }) }
  });

  await writeBatchAudit(tx, {
    batchId: batch.id,
    actorId: input.actorId,
    actorName: input.actorName,
    action: "BATCH_CREATED",
    newValue: { batchNumber, productionOrderId: order.id, warehouseId: input.warehouseId }
  });

  return { batchId: batch.id, batchNumber: batch.batchNumber, alreadyExists: false };
}

export async function createBatchFromOrder(input: unknown): Promise<BatchActionResult<{ batchId: string; batchNumber: string; alreadyExists: boolean }>> {
  try {
    const session = await getServerSession();
    requireAny(session, ["production-orders:complete", "production:execute"]);
    const parsed = createBatchFromOrderSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const batch = await prisma.$transaction((tx) =>
      createBatchForCompletedOrder(tx, { ...parsed.data, actorId: session.user.id, actorName: actorName(session), locale: session.user.languagePreference })
    );
    revalidateBatches();
    return ok(batch);
  } catch (error) {
    return unknownError(error);
  }
}

async function ensureQrForBatch(
  tx: Prisma.TransactionClient,
  batch: { id: string; batchNumber: string; qrCode: { qrCodeData: string; targetUrl: string } | null }
) {
  if (batch.qrCode) return batch.qrCode;
  const targetUrl = buildTraceabilityUrl(batch.batchNumber);
  const qrCodeData = await generateBatchQrDataUrl(targetUrl);
  return tx.batchQrCode.create({ data: { batchId: batch.id, targetUrl, qrCodeData } });
}

export async function printBatchLabelAction(input: unknown): Promise<BatchActionResult<{ labelId: string; labelData: LabelData }>> {
  try {
    const session = await getServerSession();
    requireAny(session, ["inventory:view", "inventory:manage"]);
    const parsed = printLabelSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({
        where: { id: parsed.data.batchId },
        include: { recipe: true, warehouse: true, qrCode: true }
      });
      if (!batch) throw new Error("NOT_FOUND");
      const container = parsed.data.containerId
        ? await tx.batchContainer.findFirst({ where: { id: parsed.data.containerId, batchId: batch.id } })
        : null;
      if (parsed.data.containerId && !container) throw new Error("NOT_FOUND");

      const qr = await ensureQrForBatch(tx, batch);
      const quantity = container?.remainingQuantity ?? batch.remainingQuantity;
      const label = await tx.batchLabel.create({
        data: {
          batchId: batch.id,
          containerId: container?.id,
          labelTemplate: parsed.data.template,
          productName: batch.recipe.nameEn || batch.recipe.nameAr,
          batchNumber: batch.batchNumber,
          productionDate: batch.productionDate,
          expiryDate: batch.expiryDate,
          quantity,
          unit: batch.unit,
          storageInstructions: batch.recipe.storageNotes,
          productCode: batch.recipe.code,
          warehouseName: batch.warehouse.name,
          qrCodeData: qr.qrCodeData
        }
      });
      await tx.batchPrintHistory.create({
        data: {
          batchId: batch.id,
          containerId: container?.id,
          printedById: session.user.id,
          labelTemplate: parsed.data.template,
          isReprint: parsed.data.isReprint,
          reprintReason: parsed.data.isReprint ? parsed.data.reprintReason : null
        }
      });
      await writeBatchAudit(tx, {
        batchId: batch.id,
        actorId: session.user.id,
        actorName: actorName(session),
        action: parsed.data.isReprint ? "REPRINT_LOGGED" : "LABEL_PRINTED",
        newValue: { labelId: label.id, template: parsed.data.template, containerId: container?.id ?? null }
      });

      return {
        labelId: label.id,
        labelData: {
          productName: label.productName,
          batchNumber: label.batchNumber,
          containerNumber: container?.containerNumber,
          productionDate: label.productionDate.toISOString(),
          expiryDate: label.expiryDate.toISOString(),
          quantity: Number(label.quantity),
          unit: label.unit,
          qrCodeData: label.qrCodeData,
          storageInstructions: label.storageInstructions,
          productCode: label.productCode,
          warehouseName: label.warehouseName
        }
      };
    });
    revalidateBatches();
    return ok(result);
  } catch (error) {
    return unknownError(error);
  }
}

export async function splitBatchContainersAction(input: unknown): Promise<BatchActionResult<{ containerIds: string[] }>> {
  try {
    const session = await getServerSession();
    requireAny(session, ["inventory:manage", "system:configure"]);
    const parsed = splitBatchSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id: parsed.data.batchId }, include: { containers: true } });
      if (!batch) throw new Error("NOT_FOUND");
      if (batch.containers.length > 0) throw new Error("CONFLICT");
      if (!quantitiesMatchTotal(parsed.data.quantities, batch.remainingQuantity)) throw new Error("CONTAINER_TOTAL_MISMATCH");
      const created = await Promise.all(
        parsed.data.quantities.map((quantity, index) =>
          tx.batchContainer.create({
            data: {
              batchId: batch.id,
              containerNumber: `${batch.batchNumber}-C${index + 1}`,
              quantity: new Prisma.Decimal(quantity),
              remainingQuantity: new Prisma.Decimal(quantity),
              warehouseId: batch.warehouseId
            }
          })
        )
      );
      await writeBatchAudit(tx, {
        batchId: batch.id,
        actorId: session.user.id,
        actorName: actorName(session),
        action: "CONTAINER_SPLIT",
        newValue: { quantities: parsed.data.quantities, containerIds: created.map((item) => item.id) }
      });
      return { containerIds: created.map((item) => item.id) };
    });
    revalidateBatches();
    return ok(result);
  } catch (error) {
    return unknownError(error);
  }
}

export async function updateBatchStatusAction(input: unknown): Promise<BatchActionResult<{ status: BatchStatus }>> {
  try {
    const session = await getServerSession();
    requireAny(session, ["inventory:manage", "inventory:adjust"]);
    const parsed = updateBatchStatusSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id: parsed.data.batchId } });
      if (!batch) throw new Error("NOT_FOUND");
      if (batch.status === "DISPOSED") throw new Error("CONFLICT");
      const updated = await tx.productionBatch.update({ where: { id: batch.id }, data: { status: parsed.data.status } });
      await tx.batchStatusHistory.create({
        data: { batchId: batch.id, fromStatus: batch.status, toStatus: parsed.data.status, changedById: session.user.id, reason: parsed.data.reason }
      });
      await writeBatchAudit(tx, {
        batchId: batch.id,
        actorId: session.user.id,
        actorName: actorName(session),
        action: "STATUS_CHANGED",
        previousValue: { status: batch.status },
        newValue: { status: updated.status, reason: parsed.data.reason ?? null }
      });
      return { status: updated.status };
    });
    revalidateBatches();
    return ok(result);
  } catch (error) {
    return unknownError(error);
  }
}

export async function disposeBatchAction(input: unknown): Promise<BatchActionResult<{ disposalId: string; newStatus: BatchStatus }>> {
  try {
    const session = await getServerSession();
    requireAny(session, ["inventory:adjust", "system:configure"]);
    const parsed = disposeBatchSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.productionBatch.findUnique({ where: { id: parsed.data.batchId }, include: { recipe: true } });
      if (!batch) throw new Error("NOT_FOUND");
      if (batch.status === "CONSUMED" || batch.status === "DISPOSED") throw new Error("CONFLICT");
      const quantity = new Prisma.Decimal(parsed.data.quantity);
      const container = parsed.data.containerId ? await tx.batchContainer.findFirst({ where: { id: parsed.data.containerId, batchId: batch.id } }) : null;
      if (parsed.data.containerId && !container) throw new Error("NOT_FOUND");
      const available = container?.remainingQuantity ?? batch.remainingQuantity;
      if (quantity.gt(available)) throw new Error("INSUFFICIENT_STOCK");

      const newBatchRemaining = batch.remainingQuantity.sub(quantity);
      const newBatchStatus: BatchStatus = newBatchRemaining.lte(0) ? "DISPOSED" : batch.status;
      const disposal = await tx.batchDisposal.create({
        data: {
          batchId: batch.id,
          containerId: container?.id,
          quantityDisposed: quantity,
          disposedById: session.user.id,
          reason: parsed.data.reason,
          notes: parsed.data.notes
        }
      });
      await tx.productionBatch.update({ where: { id: batch.id }, data: { remainingQuantity: newBatchRemaining, status: newBatchStatus } });
      if (container) {
        const newContainerRemaining = container.remainingQuantity.sub(quantity);
        await tx.batchContainer.update({
          where: { id: container.id },
          data: { remainingQuantity: newContainerRemaining, status: newContainerRemaining.lte(0) ? "DISPOSED" : container.status }
        });
      }
      if (newBatchStatus !== batch.status) {
        await tx.batchStatusHistory.create({
          data: { batchId: batch.id, fromStatus: batch.status, toStatus: newBatchStatus, changedById: session.user.id, reason: "Batch fully disposed." }
        });
      }
      const item = await resolveFinishedProductItem(tx, batch.recipe.code);
      if (item) {
        await recordBatchWasteLedger(tx, {
          warehouseId: batch.warehouseId,
          inventoryItemId: item.id,
          quantity,
          userId: session.user.id,
          sourceRefId: disposal.id
        });
      }
      await writeBatchAudit(tx, {
        batchId: batch.id,
        actorId: session.user.id,
        actorName: actorName(session),
        action: "BATCH_DISPOSED",
        previousValue: { remainingQuantity: batch.remainingQuantity.toString(), status: batch.status },
        newValue: { disposalId: disposal.id, quantity: quantity.toString(), status: newBatchStatus }
      });
      return { disposalId: disposal.id, newStatus: newBatchStatus };
    });
    revalidateBatches();
    return ok(result);
  } catch (error) {
    return unknownError(error);
  }
}

export async function uploadProductionEvidenceAction(batchId: string, formData: FormData): Promise<BatchActionResult<{ id: string }>> {
  try {
    const session = await getServerSession();
    requireAny(session, ["production-orders:complete", "inventory:manage"]);
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("VALIDATION", "Evidence file is required.");
    const validation = validateEvidenceFile({ type: file.type, size: file.size });
    if (!validation.valid) return fail("VALIDATION", validation.error, { maxEvidenceBytes });
    const supabase = getSupabaseAdminClient();
    if (!supabase) return fail("INTERNAL", "Supabase storage is not configured.");
    const exists = await prisma.productionBatch.findUnique({ where: { id: batchId } });
    if (!exists) return fail("NOT_FOUND", "Batch not found.");

    await supabase.storage.createBucket(BATCH_EVIDENCE_BUCKET, {
      public: false,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      fileSizeLimit: maxEvidenceBytes
    });
    const storagePath = `${batchId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploaded = await supabase.storage.from(BATCH_EVIDENCE_BUCKET).upload(storagePath, file, { upsert: false, contentType: file.type });
    if (uploaded.error) return fail("INTERNAL", uploaded.error.message);
    const evidence = await prisma.$transaction(async (tx) => {
      const created = await tx.batchEvidence.create({
        data: { batchId, fileName: file.name, storagePath, mimeType: file.type, sizeBytes: file.size, uploadedById: session.user.id }
      });
      await writeBatchAudit(tx, {
        batchId,
        actorId: session.user.id,
        actorName: actorName(session),
        action: "EVIDENCE_UPLOADED",
        newValue: { evidenceId: created.id, fileName: file.name, mimeType: file.type }
      });
      return created;
    });
    revalidateBatches();
    return ok({ id: evidence.id });
  } catch (error) {
    return unknownError(error);
  }
}
