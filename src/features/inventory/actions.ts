"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertUserWarehouseAccess } from "./lib/warehouse-access";
import { consumeInventoryForProduction, getProductionConsumptionWarnings, type ProductionConsumptionWarning } from "./lib/production-consumption";
import { addProductionOutput } from "./lib/production-output";
import {
  adjustmentSchema,
  createCategorySchema,
  createItemSchema,
  createWarehouseSchema,
  transferSchema,
  updateItemSchema,
  ingredientReferenceProfileSchema,
  wasteSchema
} from "./validation";
import { getInventoryCategories as queryInventoryCategories } from "./queries";
import { checkInventoryAlerts } from "@/features/notifications/engine";
import {
  COMPLETE_PRODUCTION_ORDERS,
  VIEW_ALL_PRODUCTION_ORDERS,
  hasProductionOrderPermission
} from "@/features/production-orders/lib/permissions";
import type {
  ActionResult,
  AdjustmentResultDto,
  InventoryCategoryDto,
  InventoryItemDto,
  InventoryErrorCode,
  TransferResultDto,
  WarehouseDto,
  WasteResultDto
} from "./types";

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail(code: InventoryErrorCode, message: string, details?: unknown): ActionResult<never> {
  return { success: false, error: { code, message, details } };
}

function validationFailure(error: { issues: { message: string }[] }) {
  return fail("VALIDATION", "Validation failed.", error.issues.map((issue) => issue.message));
}

function can(session: Awaited<ReturnType<typeof getServerSession>>, permission: string) {
  return (session.user.permissions as string[]).includes(permission);
}

function requireInventoryPermission(session: Awaited<ReturnType<typeof getServerSession>>, permission: string) {
  if (!can(session, permission)) throw new Error("FORBIDDEN");
}

function unknownError(error: unknown): ActionResult<never> {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return fail("UNAUTHORIZED", "You must sign in to continue.");
    if (error.message === "FORBIDDEN" || error.message === "PERMISSION_DENIED") return fail("FORBIDDEN", "You do not have permission for this action.");
    if (error.message === "WAREHOUSE_SCOPE_DENIED") return fail("WAREHOUSE_SCOPE_DENIED", "You are not assigned to this warehouse.");
    if (error.message === "INVALID_UNIT_CONVERSION") return fail("INVALID_UNIT_CONVERSION", "The recipe unit cannot be converted to the inventory unit.");
    if (error.message === "NOT_FOUND") return fail("NOT_FOUND", "Record not found.");
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return fail("DUPLICATE_CODE", "A record with this code or name already exists.");
  }
  return fail("INTERNAL", error instanceof Error ? error.message : "Unexpected inventory error.");
}

function revalidateInventory() {
  revalidatePath("/[locale]/inventory", "page");
  revalidatePath("/[locale]/inventory/items", "page");
  revalidatePath("/[locale]/inventory/warehouses", "page");
  revalidatePath("/[locale]/inventory/history", "page");
}

async function runInventoryAlertCheck(inventoryItemId: string) {
  try {
    await checkInventoryAlerts(inventoryItemId);
  } catch (error) {
    console.error("Inventory alert check failed", error);
  }
}

function toProfileDto(profile: Prisma.IngredientReferenceProfileGetPayload<Record<string, never>>) {
  return {
    id: profile.id,
    costReferenceQuantity: profile.costReferenceQuantity.toString(),
    costReferenceUnit: profile.costReferenceUnit,
    costReferenceValue: profile.costReferenceValue.toString(),
    calorieReferenceQuantity: profile.calorieReferenceQuantity.toString(),
    calorieReferenceUnit: profile.calorieReferenceUnit,
    calorieValue: profile.calorieValue.toString(),
    normalizedCost: profile.costReferenceValue.div(profile.costReferenceQuantity).toFixed(4),
    normalizedCalories: profile.calorieValue.div(profile.calorieReferenceQuantity).toFixed(4),
    effectiveAt: profile.effectiveAt.toISOString(),
    archivedAt: profile.archivedAt?.toISOString() ?? null
  };
}

function toItemDto(item: Prisma.InventoryItemGetPayload<{ include: { category: true; ingredientReferenceProfiles: true } }>): InventoryItemDto {
  const profiles = item.ingredientReferenceProfiles.map(toProfileDto);
  return {
    id: item.id,
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    itemType: item.itemType,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    unit: item.unit,
    minStockLevel: item.minStockLevel.toString(),
    isActive: item.isActive,
    currentReferenceProfile: profiles.find((profile) => !profile.archivedAt && new Date(profile.effectiveAt) <= new Date()) ?? null,
    referenceProfiles: profiles
  };
}

function toWarehouseDto(warehouse: { id: string; code: string; name: string; description: string | null; isActive: boolean }): WarehouseDto {
  return { id: warehouse.id, code: warehouse.code, name: warehouse.name, description: warehouse.description, isActive: warehouse.isActive };
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  targetId: string,
  previousValue: unknown,
  newValue: unknown
) {
  await tx.inventoryAuditLog.create({
    data: {
      actorId,
      action,
      targetId,
      previousValue: previousValue == null ? Prisma.JsonNull : (previousValue as Prisma.InputJsonValue),
      newValue: newValue == null ? Prisma.JsonNull : (newValue as Prisma.InputJsonValue)
    }
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

async function updateBalance(tx: Prisma.TransactionClient, warehouseId: string, inventoryItemId: string, delta: Prisma.Decimal.Value, allowNegative: boolean) {
  const balance = await lockedBalance(tx, warehouseId, inventoryItemId);
  const quantityDelta = new Prisma.Decimal(delta);
  const currentQuantity = balance.currentQuantity.add(quantityDelta);
  const availableQuantity = currentQuantity.sub(balance.reservedQuantity);
  if (!allowNegative && availableQuantity.lt(0)) return { ok: false as const, balance };
  const updated = await tx.inventoryBalance.update({
    where: { id: balance.id },
    data: { currentQuantity, availableQuantity, needsReconciliation: currentQuantity.lt(0) || balance.needsReconciliation }
  });
  return { ok: true as const, balance: updated };
}

export async function createInventoryItem(input: unknown): Promise<ActionResult<InventoryItemDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = createItemSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const item = await prisma.$transaction(async (tx) => {
      const category = await tx.inventoryCategory.findUnique({ where: { id: parsed.data.categoryId } });
      if (!category) throw new Error("NOT_FOUND");
      const created = await tx.inventoryItem.create({
        data: { ...parsed.data, code: parsed.data.code.toUpperCase(), minStockLevel: new Prisma.Decimal(parsed.data.minStockLevel) },
        include: { category: true, ingredientReferenceProfiles: { orderBy: { effectiveAt: "desc" } } }
      });
      await writeAudit(tx, session.user.id, "ITEM_CREATE", created.id, null, created);
      return created;
    });
    revalidateInventory();
    await runInventoryAlertCheck(item.id);
    return ok(toItemDto(item));
  } catch (error) {
    return unknownError(error);
  }
}

export async function updateInventoryItem(id: string, input: unknown): Promise<ActionResult<InventoryItemDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = updateItemSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const item = await prisma.$transaction(async (tx) => {
      const previous = await tx.inventoryItem.findUnique({ where: { id }, include: { category: true, ingredientReferenceProfiles: true } });
      if (!previous) throw new Error("NOT_FOUND");
      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          ...parsed.data,
          code: parsed.data.code?.toUpperCase(),
          minStockLevel: parsed.data.minStockLevel == null ? undefined : new Prisma.Decimal(parsed.data.minStockLevel)
        },
        include: { category: true, ingredientReferenceProfiles: { orderBy: { effectiveAt: "desc" } } }
      });
      await writeAudit(tx, session.user.id, "ITEM_UPDATE", id, previous, updated);
      return updated;
    });
    revalidateInventory();
    await runInventoryAlertCheck(item.id);
    return ok(toItemDto(item));
  } catch (error) {
    return unknownError(error);
  }
}

export async function upsertIngredientReferenceProfile(input: unknown): Promise<ActionResult<{ profileId: string }>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = ingredientReferenceProfileSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const profile = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: parsed.data.inventoryItemId } });
      if (!item) throw new Error("NOT_FOUND");
      const family = (unit: string) => unit === "PIECE" ? "piece" : unit === "KG" || unit === "GRAM" ? "weight" : "volume";
      if (family(item.unit) !== family(parsed.data.costReferenceUnit)) throw new Error("INVALID_UNIT_CONVERSION");
      const created = await tx.ingredientReferenceProfile.create({
        data: { ...parsed.data, effectiveAt: parsed.data.effectiveAt ?? new Date(), createdById: session.user.id }
      });
      await writeAudit(tx, session.user.id, "INGREDIENT_REFERENCE_PROFILE_CREATE", item.id, null, created);
      return created;
    });
    revalidateInventory();
    return ok({ profileId: profile.id });
  } catch (error) {
    return unknownError(error);
  }
}

export async function deactivateInventoryItem(id: string): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const updated = await prisma.$transaction(async (tx) => {
      const previous = await tx.inventoryItem.findUnique({ where: { id } });
      if (!previous) throw new Error("NOT_FOUND");
      const item = await tx.inventoryItem.update({ where: { id }, data: { isActive: false } });
      await writeAudit(tx, session.user.id, "ITEM_DEACTIVATE", id, previous, item);
      return item;
    });
    revalidateInventory();
    return ok({ id: updated.id, isActive: updated.isActive });
  } catch (error) {
    return unknownError(error);
  }
}

export async function createWarehouse(input: unknown): Promise<ActionResult<WarehouseDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const warehouse = await prisma.$transaction(async (tx) => {
      const created = await tx.warehouse.create({ data: { ...parsed.data, code: parsed.data.code.toUpperCase() } });
      await writeAudit(tx, session.user.id, "WAREHOUSE_CREATE", created.id, null, created);
      return created;
    });
    revalidateInventory();
    return ok(toWarehouseDto(warehouse));
  } catch (error) {
    return unknownError(error);
  }
}

export async function updateWarehouse(id: string, input: unknown): Promise<ActionResult<WarehouseDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const warehouse = await prisma.$transaction(async (tx) => {
      const previous = await tx.warehouse.findUnique({ where: { id } });
      if (!previous) throw new Error("NOT_FOUND");
      const updated = await tx.warehouse.update({
        where: { id },
        data: { ...parsed.data, code: parsed.data.code.toUpperCase() }
      });
      await writeAudit(tx, session.user.id, "WAREHOUSE_UPDATE", id, previous, updated);
      return updated;
    });
    revalidateInventory();
    return ok(toWarehouseDto(warehouse));
  } catch (error) {
    return unknownError(error);
  }
}

export async function deactivateWarehouse(id: string): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const updated = await prisma.$transaction(async (tx) => {
      const previous = await tx.warehouse.findUnique({ where: { id } });
      if (!previous) throw new Error("NOT_FOUND");
      const warehouse = await tx.warehouse.update({ where: { id }, data: { isActive: false } });
      await writeAudit(tx, session.user.id, "WAREHOUSE_DEACTIVATE", id, previous, warehouse);
      return warehouse;
    });
    revalidateInventory();
    return ok({ id: updated.id, isActive: updated.isActive });
  } catch (error) {
    return unknownError(error);
  }
}

export async function createInventoryCategory(input: unknown): Promise<ActionResult<InventoryCategoryDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const category = await prisma.inventoryCategory.create({ data: parsed.data });
    revalidateInventory();
    return ok({ id: category.id, name: category.name, description: category.description });
  } catch (error) {
    return unknownError(error);
  }
}

export async function getInventoryCategories(): Promise<ActionResult<InventoryCategoryDto[]>> {
  try {
    return ok(await queryInventoryCategories());
  } catch (error) {
    return unknownError(error);
  }
}

export async function transferInventory(input: unknown): Promise<ActionResult<TransferResultDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:transfer");
    const parsed = transferSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    await assertUserWarehouseAccess(session.user.id, parsed.data.sourceWhId);
    await assertUserWarehouseAccess(session.user.id, parsed.data.destWhId);
    const quantity = new Prisma.Decimal(parsed.data.quantity);
    const transfer = await prisma.$transaction(async (tx) => {
      const source = await updateBalance(tx, parsed.data.sourceWhId, parsed.data.itemId, quantity.neg(), false);
      if (!source.ok) return { blocked: true as const };
      const created = await tx.inventoryTransfer.create({
        data: {
          userId: session.user.id,
          itemId: parsed.data.itemId,
          sourceWhId: parsed.data.sourceWhId,
          destWhId: parsed.data.destWhId,
          quantity,
          notes: parsed.data.notes || null
        }
      });
      await updateBalance(tx, parsed.data.destWhId, parsed.data.itemId, quantity, true);
      await tx.stockMovement.createMany({
        data: [
          {
            userId: session.user.id,
            warehouseId: parsed.data.sourceWhId,
            inventoryItemId: parsed.data.itemId,
            quantityDelta: quantity.neg(),
            movementType: "TRANSFER_OUT",
            sourceRefId: created.id
          },
          {
            userId: session.user.id,
            warehouseId: parsed.data.destWhId,
            inventoryItemId: parsed.data.itemId,
            quantityDelta: quantity,
            movementType: "TRANSFER_IN",
            sourceRefId: created.id
          }
        ]
      });
      return { blocked: false as const, id: created.id };
    });
    if (transfer.blocked) return fail("INSUFFICIENT_STOCK", "Insufficient stock in source warehouse.");
    revalidateInventory();
    await runInventoryAlertCheck(parsed.data.itemId);
    return ok({ id: transfer.id });
  } catch (error) {
    return unknownError(error);
  }
}

export async function recordManualAdjustment(input: unknown): Promise<ActionResult<AdjustmentResultDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:adjust");
    const parsed = adjustmentSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    await assertUserWarehouseAccess(session.user.id, parsed.data.warehouseId);
    const delta = new Prisma.Decimal(parsed.data.quantityDelta);
    const result = await prisma.$transaction(async (tx) => {
      const update = await updateBalance(tx, parsed.data.warehouseId, parsed.data.inventoryItemId, delta, false);
      if (!update.ok) return { blocked: true as const };
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          userId: session.user.id,
          warehouseId: parsed.data.warehouseId,
          inventoryItemId: parsed.data.inventoryItemId,
          quantityDelta: delta,
          reason: parsed.data.reason,
          notes: parsed.data.notes || null
        }
      });
      await tx.stockMovement.create({
        data: {
          userId: session.user.id,
          warehouseId: parsed.data.warehouseId,
          inventoryItemId: parsed.data.inventoryItemId,
          quantityDelta: delta,
          movementType: delta.gt(0) ? "ADJUSTMENT_INCREASE" : "ADJUSTMENT_DECREASE",
          sourceRefId: adjustment.id
        }
      });
      return { blocked: false as const, id: adjustment.id, newQuantity: update.balance.currentQuantity.toString() };
    });
    if (result.blocked) return fail("ADJUSTMENT_BLOCKED_NEGATIVE_STOCK", "Adjustment blocked: would result in negative stock.");
    revalidateInventory();
    await runInventoryAlertCheck(parsed.data.inventoryItemId);
    return ok({ id: result.id, newQuantity: result.newQuantity });
  } catch (error) {
    return unknownError(error);
  }
}

export async function recordInventoryWaste(input: unknown): Promise<ActionResult<WasteResultDto>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:adjust");
    const parsed = wasteSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    await assertUserWarehouseAccess(session.user.id, parsed.data.warehouseId);
    const quantity = new Prisma.Decimal(parsed.data.quantity);
    const result = await prisma.$transaction(async (tx) => {
      const update = await updateBalance(tx, parsed.data.warehouseId, parsed.data.inventoryItemId, quantity.neg(), false);
      if (!update.ok) return { blocked: true as const };
      const waste = await tx.inventoryWasteRecord.create({
        data: {
          userId: session.user.id,
          warehouseId: parsed.data.warehouseId,
          inventoryItemId: parsed.data.inventoryItemId,
          quantity,
          reason: parsed.data.reason,
          notes: parsed.data.notes || null
        }
      });
      await tx.stockMovement.create({
        data: {
          userId: session.user.id,
          warehouseId: parsed.data.warehouseId,
          inventoryItemId: parsed.data.inventoryItemId,
          quantityDelta: quantity.neg(),
          movementType: "WASTE",
          sourceRefId: waste.id
        }
      });
      return { blocked: false as const, id: waste.id, newQuantity: update.balance.currentQuantity.toString() };
    });
    if (result.blocked) return fail("INSUFFICIENT_STOCK", "Insufficient stock for waste recording.");
    revalidateInventory();
    await runInventoryAlertCheck(parsed.data.inventoryItemId);
    return ok({ id: result.id, newQuantity: result.newQuantity });
  } catch (error) {
    return unknownError(error);
  }
}

export async function completeProductionOrderInventory(input: unknown): Promise<ActionResult<{ warnings: unknown[] }>> {
  try {
    const session = await getServerSession();
    requireInventoryPermission(session, "inventory:manage");
    const parsed = transferSchema
      .pick({ itemId: true, quantity: true })
      .extend({
        productionOrderId: transferSchema.shape.itemId,
        outputWarehouseId: transferSchema.shape.sourceWhId,
        sourceWarehouseId: transferSchema.shape.sourceWhId.optional()
      })
      .safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    const warnings = await prisma.$transaction(async (tx) => {
      const order = await tx.productionOrder.findUnique({
        where: { id: parsed.data.productionOrderId },
        select: { status: true, sourceWarehouseId: true, _count: { select: { inventoryConsumptionLogs: true, inventoryOutputLogs: true } } }
      });
      if (!order) throw new Error("NOT_FOUND");
      if (order.status !== "COMPLETED") throw new Error("ORDER_NOT_COMPLETED");
      if (order._count.inventoryConsumptionLogs > 0 || order._count.inventoryOutputLogs > 0) throw new Error("INVENTORY_ALREADY_POSTED");
      const sourceWarehouseId = order.sourceWarehouseId ?? parsed.data.sourceWarehouseId ?? parsed.data.outputWarehouseId;
      await assertUserWarehouseAccess(session.user.id, sourceWarehouseId);
      await assertUserWarehouseAccess(session.user.id, parsed.data.outputWarehouseId);
      const warningPayload = await getProductionConsumptionWarnings(parsed.data.productionOrderId, sourceWarehouseId, tx);
      await consumeInventoryForProduction(parsed.data.productionOrderId, sourceWarehouseId, session.user.id, tx);
      await addProductionOutput(
        parsed.data.productionOrderId,
        parsed.data.outputWarehouseId,
        parsed.data.itemId,
        parsed.data.quantity,
        session.user.id,
        tx
      );
      return warningPayload;
    });
    revalidateInventory();
    revalidatePath("/[locale]/production/[id]", "page");
    await runInventoryAlertCheck(parsed.data.itemId);
    return ok({ warnings });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_COMPLETED") return fail("VALIDATION", "The production order must be completed first.");
    if (error instanceof Error && error.message === "INVENTORY_ALREADY_POSTED") return fail("VALIDATION", "Inventory was already posted for this production order.");
    return unknownError(error);
  }
}

export async function previewProductionConsumptionWarnings(
  productionOrderId: string,
  sourceWarehouseId: string,
  producedQuantity?: number
): Promise<ActionResult<{ warnings: ProductionConsumptionWarning[] }>> {
  try {
    const session = await getServerSession();
    const canCompleteProduction = hasProductionOrderPermission(session.user.permissions, COMPLETE_PRODUCTION_ORDERS);
    if (canCompleteProduction) {
      const order = await prisma.productionOrder.findUnique({
        where: { id: productionOrderId },
        select: { assignedToId: true }
      });
      if (!order) return fail("NOT_FOUND", "Production order not found.");
      const canViewAll = hasProductionOrderPermission(session.user.permissions, VIEW_ALL_PRODUCTION_ORDERS);
      if (order.assignedToId !== session.user.id && !canViewAll) throw new Error("FORBIDDEN");
    } else {
      requireInventoryPermission(session, "inventory:view");
      await assertUserWarehouseAccess(session.user.id, sourceWarehouseId);
    }
    const warnings = await prisma.$transaction((tx) => getProductionConsumptionWarnings(productionOrderId, sourceWarehouseId, tx, producedQuantity));
    return ok({ warnings });
  } catch (error) {
    return unknownError(error);
  }
}

export async function recordBatchWasteLedger(
  tx: Prisma.TransactionClient,
  input: {
    warehouseId: string;
    inventoryItemId: string;
    quantity: Prisma.Decimal;
    userId: string;
    sourceRefId: string;
  }
) {
  const update = await updateBalance(tx, input.warehouseId, input.inventoryItemId, input.quantity.neg(), false);
  if (!update.ok) throw new Error("INSUFFICIENT_STOCK");
  await tx.stockMovement.create({
    data: {
      userId: input.userId,
      warehouseId: input.warehouseId,
      inventoryItemId: input.inventoryItemId,
      quantityDelta: input.quantity.neg(),
      movementType: "WASTE",
      sourceRefId: input.sourceRefId
    }
  });
}
