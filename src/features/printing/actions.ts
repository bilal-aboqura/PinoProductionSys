"use server";

import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/features/audit/lib/logger";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canCreatePrintJobs, canManagePrinters, canReprintLabels, getPrintHistory } from "./queries";
import type { ActionResult, CreatePrintJobInput, PrintPayload, PrinterConfigInput, ReprintInput } from "./types";
import { createPrintJobSchema, printerConfigSchema, reprintSchema, updatePrintJobStatusSchema } from "./validation";

export { getPrintHistory };

function publicBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "PERMISSION_DENIED") return "You do not have permission for this action.";
    if (error.message === "NOT_FOUND") return "Record not found.";
    return error.message;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "A printer or template with this name already exists.";
  return "Unexpected printing error.";
}

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value == null ? undefined : value.toString();
}

async function qrImage(data: string) {
  return QRCode.toDataURL(data, { errorCorrectionLevel: "M", margin: 1, width: 180 });
}

async function buildPrintPayload(targetType: CreatePrintJobInput["targetType"], targetId: string): Promise<PrintPayload> {
  if (targetType === "BATCH") {
    const batch = await prisma.productionBatch.findFirst({
      where: { OR: [{ id: targetId }, { batchNumber: targetId }] },
      include: { recipe: true, recipeVersion: true, warehouse: true }
    });
    if (!batch) throw new Error("NOT_FOUND");
    const qrCodeData = `${publicBaseUrl()}/inventory/batches/${encodeURIComponent(batch.batchNumber)}?view=scan`;
    return {
      title: batch.recipe.nameEn || batch.recipe.nameAr,
      subtitle: "Batch Label",
      productName: batch.recipe.nameEn || batch.recipe.nameAr,
      batchNumber: batch.batchNumber,
      productionDate: batch.productionDate.toISOString(),
      expiryDate: batch.expiryDate.toISOString(),
      quantity: decimalToString(batch.producedQuantity),
      unit: batch.unit,
      warehouseName: batch.warehouse.name,
      storageInstructions: batch.recipe.storageNotes,
      servingSize: batch.recipeVersion.servingQuantity ? `${batch.recipeVersion.servingQuantity} ${batch.recipeVersion.servingUnit ?? ""}${batch.recipeVersion.servingLabel ? ` (${batch.recipeVersion.servingLabel})` : ""}`.trim() : undefined,
      caloriesPerServing: decimalToString(batch.recipeVersion.caloriesPerServing),
      caloriesPerUnit: decimalToString(batch.recipeVersion.caloriesPerYieldUnit),
      totalCalories: decimalToString(batch.recipeVersion.totalCalories),
      costPerUnit: decimalToString(batch.recipeVersion.costPerYieldUnit),
      totalCost: decimalToString(batch.recipeVersion.totalCost),
      sellingPrice: decimalToString(batch.recipeVersion.sellingPriceSnapshot),
      profit: decimalToString(batch.recipeVersion.profitAmountSnapshot),
      margin: decimalToString(batch.recipeVersion.profitMarginSnapshot),
      qrCodeData,
      qrCodeImage: await qrImage(qrCodeData)
    };
  }

  if (targetType === "CONTAINER") {
    const container = await prisma.batchContainer.findFirst({
      where: { OR: [{ id: targetId }, { containerNumber: targetId }] },
      include: { batch: { include: { recipe: true, recipeVersion: true, warehouse: true } } }
    });
    if (!container) throw new Error("NOT_FOUND");
    const qrCodeData = `${publicBaseUrl()}/inventory/batches/${encodeURIComponent(container.batch.batchNumber)}?view=scan&container=${encodeURIComponent(container.containerNumber)}`;
    return {
      title: container.batch.recipe.nameEn || container.batch.recipe.nameAr,
      subtitle: "Container Label",
      productName: container.batch.recipe.nameEn || container.batch.recipe.nameAr,
      batchNumber: container.batch.batchNumber,
      containerNumber: container.containerNumber,
      quantity: decimalToString(container.quantity),
      unit: container.batch.unit,
      warehouseName: container.batch.warehouse.name,
      servingSize: container.batch.recipeVersion.servingQuantity ? `${container.batch.recipeVersion.servingQuantity} ${container.batch.recipeVersion.servingUnit ?? ""}`.trim() : undefined,
      caloriesPerServing: decimalToString(container.batch.recipeVersion.caloriesPerServing),
      caloriesPerUnit: decimalToString(container.batch.recipeVersion.caloriesPerYieldUnit),
      totalCalories: decimalToString(container.batch.recipeVersion.totalCalories),
      costPerUnit: decimalToString(container.batch.recipeVersion.costPerYieldUnit),
      totalCost: decimalToString(container.batch.recipeVersion.totalCost),
      sellingPrice: decimalToString(container.batch.recipeVersion.sellingPriceSnapshot),
      profit: decimalToString(container.batch.recipeVersion.profitAmountSnapshot),
      margin: decimalToString(container.batch.recipeVersion.profitMarginSnapshot),
      qrCodeData,
      qrCodeImage: await qrImage(qrCodeData)
    };
  }

  const warehouse = await prisma.warehouse.findFirst({ where: { OR: [{ id: targetId }, { code: targetId }] } });
  if (!warehouse) throw new Error("NOT_FOUND");
  const qrCodeData = `${publicBaseUrl()}/inventory?warehouseId=${encodeURIComponent(warehouse.id)}`;
  return {
    title: warehouse.name,
    subtitle: "Warehouse Label",
    warehouseName: warehouse.name,
    warehouseCode: warehouse.code,
    qrCodeData,
    qrCodeImage: await qrImage(qrCodeData)
  };
}

function revalidatePrinting() {
  revalidatePath("/[locale]/printing", "page");
  revalidatePath("/[locale]/admin/printers", "page");
  revalidatePath("/[locale]/inventory/batches/[batchNumber]", "page");
}

export async function createPrintJob(input: CreatePrintJobInput): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    if (!canCreatePrintJobs(session.user.permissions)) throw new Error("PERMISSION_DENIED");
    const parsed = createPrintJobSchema.parse(input);
    const [template, printer] = await Promise.all([
      prisma.printTemplate.findFirst({ where: { id: parsed.templateId, isActive: true } }),
      parsed.printerId ? prisma.printer.findFirst({ where: { id: parsed.printerId, isActive: true } }) : prisma.printer.findFirst({ where: { isDefault: true, isActive: true } })
    ]);
    if (!template) throw new Error("NOT_FOUND");
    const payload = await buildPrintPayload(parsed.targetType, parsed.targetId);
    const job = await prisma.printJob.create({
      data: {
        printerId: printer?.id ?? null,
        templateId: template.id,
        status: "PENDING",
        targetType: parsed.targetType,
        targetId: parsed.targetId,
        quantity: parsed.quantity,
        payload: payload as unknown as Prisma.InputJsonValue,
        createdById: session.user.id
      }
    });
    revalidatePrinting();
    return { success: true, jobId: job.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function savePrinterConfig(id: string | null, data: PrinterConfigInput): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    if (!canManagePrinters(session.user.permissions)) throw new Error("PERMISSION_DENIED");
    const parsed = printerConfigSchema.parse(data);
    const printer = await prisma.$transaction(async (tx) => {
      if (parsed.isDefault) {
        await tx.printer.updateMany({ where: { isDefault: true, ...(id ? { id: { not: id } } : {}) }, data: { isDefault: false } });
      }
      return id
        ? tx.printer.update({
            where: { id },
            data: {
              name: parsed.name,
              description: parsed.description || null,
              type: parsed.type,
              isDefault: parsed.isDefault,
              isActive: parsed.isActive
            }
          })
        : tx.printer.create({
            data: {
              name: parsed.name,
              description: parsed.description || null,
              type: parsed.type,
              isDefault: parsed.isDefault,
              isActive: parsed.isActive
            }
          });
    });
    await logAuditEvent({
      actorId: session.user.id,
      actorName: session.user.displayName,
      targetId: printer.id,
      targetName: printer.name,
      action: id ? "PRINTER_UPDATED" : "PRINTER_CREATED",
      newValue: {
        name: printer.name,
        type: printer.type,
        isDefault: printer.isDefault,
        isActive: printer.isActive
      }
    });
    revalidatePrinting();
    return { success: true, printerId: printer.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deletePrinterConfig(id: string): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    if (!canManagePrinters(session.user.permissions)) throw new Error("PERMISSION_DENIED");
    const printer = await prisma.printer.update({ where: { id }, data: { isActive: false, isDefault: false } });
    await logAuditEvent({
      actorId: session.user.id,
      actorName: session.user.displayName,
      targetId: printer.id,
      targetName: printer.name,
      action: "PRINTER_DEACTIVATED",
      newValue: { isActive: false }
    });
    revalidatePrinting();
    return { success: true, printerId: printer.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function recordReprint(input: ReprintInput): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    if (!canReprintLabels(session.user.permissions)) throw new Error("PERMISSION_DENIED");
    const parsed = reprintSchema.parse(input);
    const job = await prisma.printJob.findUnique({ where: { id: parsed.printJobId }, include: { template: true, printer: true } });
    if (!job) throw new Error("NOT_FOUND");
    await prisma.printReprint.create({
      data: {
        printJobId: job.id,
        reason: parsed.reason,
        customReason: parsed.customReason || null,
        requestedById: session.user.id,
        requestedByName: session.user.displayName
      }
    });
    await logAuditEvent({
      actorId: session.user.id,
      actorName: session.user.displayName,
      targetId: job.id,
      targetName: `${job.targetType} ${job.targetId}`,
      action: "LABEL_REPRINTED",
      newValue: {
        reason: parsed.reason,
        customReason: parsed.customReason || null,
        printerName: job.printer?.name ?? "Browser default",
        templateName: job.template.name
      }
    });
    revalidatePrinting();
    return { success: true, jobId: job.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updatePrintJobStatus(input: { jobId: string; status: "COMPLETED" | "FAILED"; errorMessage?: string | null }): Promise<ActionResult> {
  try {
    const session = await getServerSession();
    if (!canCreatePrintJobs(session.user.permissions) && !canReprintLabels(session.user.permissions)) throw new Error("PERMISSION_DENIED");
    const parsed = updatePrintJobStatusSchema.parse(input);
    const job = await prisma.printJob.update({
      where: { id: parsed.jobId },
      data: { status: parsed.status },
      include: { printer: true, template: true }
    });
    await prisma.printHistory.create({
      data: {
        printJobId: job.id,
        printerName: job.printer?.name ?? "Browser default",
        templateName: job.template.name,
        actorId: session.user.id,
        actorName: session.user.displayName,
        status: parsed.status === "COMPLETED" ? "SUCCESS" : "FAILED",
        errorMessage: parsed.errorMessage || null
      }
    });
    await logAuditEvent({
      actorId: session.user.id,
      actorName: session.user.displayName,
      targetId: job.id,
      targetName: `${job.targetType} ${job.targetId}`,
      action: parsed.status === "COMPLETED" ? "LABEL_PRINTED" : "PRINT_JOB_FAILED",
      newValue: { status: parsed.status, errorMessage: parsed.errorMessage || null }
    });
    revalidatePrinting();
    return { success: true, jobId: job.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
