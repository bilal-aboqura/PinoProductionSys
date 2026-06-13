import { Prisma, type Unit } from "@prisma/client";
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

async function lockedBalance(tx: Prisma.TransactionClient, warehouseId: string, inventoryItemId: string) {
  const balance = await tx.inventoryBalance.upsert({
    where: { warehouseId_inventoryItemId: { warehouseId, inventoryItemId } },
    update: {},
    create: { warehouseId, inventoryItemId }
  });
  await tx.$queryRaw`SELECT id FROM inventory_balances WHERE id = ${balance.id} FOR UPDATE`;
  return tx.inventoryBalance.findUniqueOrThrow({ where: { id: balance.id }, include: { inventoryItem: true } });
}

function ratioFor(order: { producedQuantity: Prisma.Decimal | null; targetQuantity: Prisma.Decimal | null; recipe: { yieldQuantity: Prisma.Decimal } }) {
  const produced = order.producedQuantity ?? order.targetQuantity ?? order.recipe.yieldQuantity;
  if (!produced || order.recipe.yieldQuantity.lte(0)) return new Prisma.Decimal(1);
  return new Prisma.Decimal(produced).div(order.recipe.yieldQuantity);
}

export async function getProductionConsumptionWarnings(
  productionOrderId: string,
  sourceWarehouseId: string,
  tx: Prisma.TransactionClient
): Promise<ProductionConsumptionWarning[]> {
  const order = await tx.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } }
  });
  if (!order) throw new Error("NOT_FOUND");
  const ratio = ratioFor(order);
  const warnings = [];
  for (const ingredient of order.recipe.ingredients) {
    const required = convertUnit(ingredient.quantity.mul(ratio), ingredient.unit as Unit, ingredient.inventoryItem.unit);
    const balance = await tx.inventoryBalance.findUnique({
      where: { warehouseId_inventoryItemId: { warehouseId: sourceWarehouseId, inventoryItemId: ingredient.inventoryItemId } }
    });
    const current = balance?.currentQuantity ?? new Prisma.Decimal(0);
    if (current.sub(required).lt(0)) {
      warnings.push({
        inventoryItemId: ingredient.inventoryItemId,
        code: ingredient.inventoryItem.code,
        name: ingredient.inventoryItem.nameEn || ingredient.inventoryItem.nameAr,
        required: required.toString(),
        current: current.toString(),
        projected: current.sub(required).toString(),
        unit: ingredient.inventoryItem.unit
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
  const order = await tx.productionOrder.findUnique({
    where: { id: productionOrderId },
    include: { recipe: { include: { ingredients: { include: { inventoryItem: true } } } } }
  });
  if (!order) throw new Error("NOT_FOUND");
  const ratio = ratioFor(order);
  const warnings = await getProductionConsumptionWarnings(productionOrderId, sourceWarehouseId, tx);

  for (const ingredient of order.recipe.ingredients) {
    const consumed = convertUnit(ingredient.quantity.mul(ratio), ingredient.unit as Unit, ingredient.inventoryItem.unit);
    const balance = await lockedBalance(tx, sourceWarehouseId, ingredient.inventoryItemId);
    const currentQuantity = balance.currentQuantity.sub(consumed);
    const availableQuantity = currentQuantity.sub(balance.reservedQuantity);
    const wentNegative = currentQuantity.lt(0);
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { currentQuantity, availableQuantity, needsReconciliation: wentNegative || balance.needsReconciliation }
    });
    await tx.stockMovement.create({
      data: {
        userId,
        warehouseId: sourceWarehouseId,
        inventoryItemId: ingredient.inventoryItemId,
        quantityDelta: consumed.neg(),
        movementType: "PRODUCTION_CONSUMPTION",
        sourceRefId: productionOrderId
      }
    });
    await tx.inventoryConsumptionLog.create({
      data: { productionOrderId, warehouseId: sourceWarehouseId, inventoryItemId: ingredient.inventoryItemId, quantityConsumed: consumed }
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
