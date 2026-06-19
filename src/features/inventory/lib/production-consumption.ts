import { Prisma, type Unit } from "@prisma/client";
import type { RecipeSnapshot } from "@/lib/recipes/snapshot";
import { convertUnit } from "./unit-converter";

export type ProductionConsumptionWarning = {
  inventoryItemId: string;
  code: string;
  name: string;
  required: string;
  current: string;
  projected: string;
  unit: Unit;
};

type Requirement = {
  inventoryItemId: string;
  code: string;
  name: string;
  quantity: Prisma.Decimal;
  unit: Unit;
};

async function lockedBalance(tx: Prisma.TransactionClient, warehouseId: string, inventoryItemId: string) {
  const balance = await tx.inventoryBalance.upsert({
    where: { warehouseId_inventoryItemId: { warehouseId, inventoryItemId } },
    update: {},
    create: { warehouseId, inventoryItemId }
  });
  await tx.$queryRaw`SELECT id FROM inventory_balances WHERE id = ${balance.id} FOR UPDATE`;
  return tx.inventoryBalance.findUniqueOrThrow({ where: { id: balance.id } });
}

async function productionRequirements(
  productionOrderId: string,
  tx: Prisma.TransactionClient,
  producedQuantity?: Prisma.Decimal.Value,
  useTargetQuantity = false
): Promise<{ requirements: Requirement[]; hasReservation: boolean }> {
  const order = await tx.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { recipeVersion: true }
  });
  if (!order) throw new Error("NOT_FOUND");
  const snapshot = order.recipeVersion.snapshot as unknown as RecipeSnapshot;
  const yieldQuantity = new Prisma.Decimal(snapshot.yieldQuantity);
  if (yieldQuantity.lte(0)) throw new Error("INVALID_RECIPE_YIELD");
  const outputQuantity = new Prisma.Decimal(
    useTargetQuantity ? order.targetQuantity ?? yieldQuantity : producedQuantity ?? order.producedQuantity ?? order.targetQuantity ?? yieldQuantity
  );
  const ratio = outputQuantity.div(yieldQuantity);
  const itemIds = [...new Set(snapshot.ingredients.map((ingredient) => ingredient.inventoryItemId))];
  const items = await tx.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, code: true, nameEn: true, nameAr: true, unit: true }
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const requirementByItem = new Map<string, Requirement>();
  for (const ingredient of snapshot.ingredients) {
    const item = itemById.get(ingredient.inventoryItemId);
    if (!item) throw new Error("NOT_FOUND");
    const quantity = convertUnit(new Prisma.Decimal(ingredient.quantity).mul(ratio), ingredient.unit as Unit, item.unit);
    const existing = requirementByItem.get(item.id);
    requirementByItem.set(item.id, {
      inventoryItemId: item.id,
      code: item.code,
      name: item.nameEn || item.nameAr,
      quantity: existing ? existing.quantity.add(quantity) : quantity,
      unit: item.unit
    });
  }
  const requirements = [...requirementByItem.values()];
  return { requirements, hasReservation: Boolean(order.sourceWarehouseId) };
}

export async function reserveInventoryForProduction(productionOrderId: string, sourceWarehouseId: string, tx: Prisma.TransactionClient) {
  const { requirements } = await productionRequirements(productionOrderId, tx);
  for (const requirement of [...requirements].sort((a, b) => a.inventoryItemId.localeCompare(b.inventoryItemId))) {
    const balance = await lockedBalance(tx, sourceWarehouseId, requirement.inventoryItemId);
    if (balance.availableQuantity.lt(requirement.quantity)) throw new Error(`INSUFFICIENT_INVENTORY:${requirement.code}`);
    const reservedQuantity = balance.reservedQuantity.add(requirement.quantity);
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { reservedQuantity, availableQuantity: balance.currentQuantity.sub(reservedQuantity) }
    });
  }
}

export async function releaseInventoryReservationForProduction(productionOrderId: string, sourceWarehouseId: string, tx: Prisma.TransactionClient) {
  const { requirements } = await productionRequirements(productionOrderId, tx);
  for (const requirement of [...requirements].sort((a, b) => a.inventoryItemId.localeCompare(b.inventoryItemId))) {
    const balance = await lockedBalance(tx, sourceWarehouseId, requirement.inventoryItemId);
    const released = Prisma.Decimal.min(balance.reservedQuantity, requirement.quantity);
    const reservedQuantity = balance.reservedQuantity.sub(released);
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { reservedQuantity, availableQuantity: balance.currentQuantity.sub(reservedQuantity) }
    });
  }
}

export async function getProductionConsumptionWarnings(
  productionOrderId: string,
  sourceWarehouseId: string,
  tx: Prisma.TransactionClient,
  producedQuantity?: Prisma.Decimal.Value
): Promise<ProductionConsumptionWarning[]> {
  const { requirements } = await productionRequirements(productionOrderId, tx, producedQuantity);
  const warnings: ProductionConsumptionWarning[] = [];
  for (const requirement of requirements) {
    const balance = await tx.inventoryBalance.findUnique({
      where: { warehouseId_inventoryItemId: { warehouseId: sourceWarehouseId, inventoryItemId: requirement.inventoryItemId } }
    });
    const current = balance?.currentQuantity ?? new Prisma.Decimal(0);
    if (current.lt(requirement.quantity)) {
      warnings.push({
        inventoryItemId: requirement.inventoryItemId,
        code: requirement.code,
        name: requirement.name,
        required: requirement.quantity.toString(),
        current: current.toString(),
        projected: current.sub(requirement.quantity).toString(),
        unit: requirement.unit
      });
    }
  }
  return warnings;
}

export async function consumeInventoryForProduction(
  productionOrderId: string,
  sourceWarehouseId: string,
  userId: string,
  tx: Prisma.TransactionClient
) {
  const [{ requirements, hasReservation }, reserved] = await Promise.all([
    productionRequirements(productionOrderId, tx),
    productionRequirements(productionOrderId, tx, undefined, true)
  ]);
  const reservedByItem = new Map(reserved.requirements.map((item) => [item.inventoryItemId, item.quantity]));
  const warnings = await getProductionConsumptionWarnings(productionOrderId, sourceWarehouseId, tx);

  for (const requirement of [...requirements].sort((a, b) => a.inventoryItemId.localeCompare(b.inventoryItemId))) {
    const balance = await lockedBalance(tx, sourceWarehouseId, requirement.inventoryItemId);
    const currentQuantity = balance.currentQuantity.sub(requirement.quantity);
    const reservation = hasReservation ? reservedByItem.get(requirement.inventoryItemId) ?? new Prisma.Decimal(0) : new Prisma.Decimal(0);
    const reservedQuantity = Prisma.Decimal.max(0, balance.reservedQuantity.sub(reservation));
    const availableQuantity = currentQuantity.sub(reservedQuantity);
    const wentNegative = currentQuantity.lt(0);
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { currentQuantity, reservedQuantity, availableQuantity, needsReconciliation: wentNegative || balance.needsReconciliation }
    });
    await tx.stockMovement.create({
      data: {
        userId,
        warehouseId: sourceWarehouseId,
        inventoryItemId: requirement.inventoryItemId,
        quantityDelta: requirement.quantity.neg(),
        movementType: "PRODUCTION_CONSUMPTION",
        sourceRefId: productionOrderId
      }
    });
    await tx.inventoryConsumptionLog.create({
      data: { productionOrderId, warehouseId: sourceWarehouseId, inventoryItemId: requirement.inventoryItemId, quantityConsumed: requirement.quantity }
    });
    if (wentNegative) {
      await tx.inventoryAuditLog.create({
        data: {
          actorId: userId,
          action: "NEGATIVE_STOCK_PRODUCTION_CONSUMPTION",
          targetId: balance.id,
          previousValue: { currentQuantity: balance.currentQuantity.toString() },
          newValue: { currentQuantity: currentQuantity.toString(), productionOrderId }
        }
      });
    }
  }
  return { warnings };
}
