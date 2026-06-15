import { Prisma } from "@prisma/client";

async function lockedBalance(tx: Prisma.TransactionClient, warehouseId: string, inventoryItemId: string) {
  const balance = await tx.inventoryBalance.upsert({
    where: { warehouseId_inventoryItemId: { warehouseId, inventoryItemId } },
    update: {},
    create: { warehouseId, inventoryItemId }
  });
  await tx.$queryRaw`SELECT id FROM inventory_balances WHERE id = ${balance.id} FOR UPDATE`;
  return tx.inventoryBalance.findUniqueOrThrow({ where: { id: balance.id } });
}

export async function addProductionOutput(
  productionOrderId: string,
  warehouseId: string,
  itemId: string,
  qty: Prisma.Decimal.Value,
  userId: string,
  tx: Prisma.TransactionClient
) {
  const quantity = new Prisma.Decimal(qty);
  const balance = await lockedBalance(tx, warehouseId, itemId);
  const currentQuantity = balance.currentQuantity.add(quantity);
  const availableQuantity = currentQuantity.sub(balance.reservedQuantity);
  await tx.inventoryBalance.update({
    where: { id: balance.id },
    data: { currentQuantity, availableQuantity, needsReconciliation: currentQuantity.lt(0) }
  });
  await tx.stockMovement.create({
    data: {
      userId,
      warehouseId,
      inventoryItemId: itemId,
      quantityDelta: quantity,
      movementType: "PRODUCTION_OUTPUT",
      sourceRefId: productionOrderId
    }
  });
  await tx.inventoryOutputLog.create({
    data: { productionOrderId, warehouseId, inventoryItemId: itemId, quantityProduced: quantity }
  });
}
