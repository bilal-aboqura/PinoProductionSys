import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertUserWarehouseAccess } from "./lib/warehouse-access";
import type { InventoryBalanceImportError, InventoryBalanceImportRow } from "./inventory-balance-excel";

function normalized(value: string) {
  return value.trim().toLocaleLowerCase();
}

export async function importInventoryBalanceRows(rows: InventoryBalanceImportRow[], actorId: string) {
  const itemCodes = [...new Set(rows.map((row) => row.itemCode))];
  const warehouseCodes = [...new Set(rows.map((row) => row.warehouseCode))];
  const [items, warehouses] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { code: { in: itemCodes } }, select: { id: true, code: true, nameEn: true, nameAr: true, unit: true, isActive: true } }),
    prisma.warehouse.findMany({ where: { code: { in: warehouseCodes } }, select: { id: true, code: true, name: true, isActive: true } })
  ]);
  const itemByCode = new Map(items.map((item) => [item.code, item]));
  const warehouseByCode = new Map(warehouses.map((warehouse) => [warehouse.code, warehouse]));
  const errors: InventoryBalanceImportError[] = [];
  const workbookKeys = new Map<string, number>();

  for (const row of rows) {
    const item = itemByCode.get(row.itemCode);
    const warehouse = warehouseByCode.get(row.warehouseCode);
    if (!item) errors.push({ row: row.rowNumber, column: "Item Code", message: `Item code ${row.itemCode} does not exist.` });
    else {
      if (!item.isActive) errors.push({ row: row.rowNumber, column: "Item Code", message: `Item code ${row.itemCode} is inactive.` });
      if (item.unit !== row.unit) errors.push({ row: row.rowNumber, column: "Unit", message: `Unit must match item base unit (${item.unit}).` });
      if (row.itemName && normalized(row.itemName) !== normalized(item.nameEn) && normalized(row.itemName) !== normalized(item.nameAr)) {
        errors.push({ row: row.rowNumber, column: "Item Name", message: `Item Name does not match item code ${row.itemCode}.` });
      }
    }
    if (!warehouse) errors.push({ row: row.rowNumber, column: "Warehouse Code", message: `Warehouse code ${row.warehouseCode} does not exist.` });
    else {
      if (!warehouse.isActive) errors.push({ row: row.rowNumber, column: "Warehouse Code", message: `Warehouse code ${row.warehouseCode} is inactive.` });
      if (row.warehouseName && normalized(row.warehouseName) !== normalized(warehouse.name)) {
        errors.push({ row: row.rowNumber, column: "Warehouse Name", message: `Warehouse Name does not match warehouse code ${row.warehouseCode}.` });
      }
    }
    const key = `${row.itemCode}:${row.warehouseCode}`;
    const previousRow = workbookKeys.get(key);
    if (previousRow) errors.push({ row: row.rowNumber, column: "Workbook", message: `Duplicates row ${previousRow} for the same item and warehouse.` });
    else workbookKeys.set(key, row.rowNumber);
  }
  if (errors.length > 0) return { importedRowCount: 0, skippedRowCount: 0, errors };

  for (const warehouse of warehouses) await assertUserWarehouseAccess(actorId, warehouse.id);

  let importedRowCount = 0;
  let skippedRowCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const item = itemByCode.get(row.itemCode)!;
      const warehouse = warehouseByCode.get(row.warehouseCode)!;
      const existing = await tx.inventoryBalance.upsert({
        where: { warehouseId_inventoryItemId: { warehouseId: warehouse.id, inventoryItemId: item.id } },
        update: {},
        create: { warehouseId: warehouse.id, inventoryItemId: item.id }
      });
      const counted = new Prisma.Decimal(row.countedQuantity);
      if (counted.lt(existing.reservedQuantity)) {
        errors.push({ row: row.rowNumber, column: "Counted Quantity", message: "Counted Quantity cannot be less than reserved quantity." });
        continue;
      }
      const delta = counted.sub(existing.currentQuantity);
      if (delta.eq(0)) {
        skippedRowCount += 1;
        continue;
      }
      const adjustment = await tx.inventoryAdjustment.create({
        data: {
          userId: actorId,
          warehouseId: warehouse.id,
          inventoryItemId: item.id,
          quantityDelta: delta,
          reason: row.reason,
          notes: row.notes
        }
      });
      await tx.inventoryBalance.update({
        where: { id: existing.id },
        data: {
          currentQuantity: counted,
          availableQuantity: counted.sub(existing.reservedQuantity),
          needsReconciliation: false
        }
      });
      await tx.stockMovement.create({
        data: {
          userId: actorId,
          warehouseId: warehouse.id,
          inventoryItemId: item.id,
          quantityDelta: delta,
          movementType: delta.gt(0) ? "ADJUSTMENT_INCREASE" : "ADJUSTMENT_DECREASE",
          sourceRefId: adjustment.id
        }
      });
      await tx.inventoryAuditLog.create({
        data: {
          actorId,
          action: "INVENTORY_BALANCE_IMPORT_ADJUST",
          targetId: existing.id,
          previousValue: {
            currentQuantity: existing.currentQuantity.toString(),
            reservedQuantity: existing.reservedQuantity.toString(),
            availableQuantity: existing.availableQuantity.toString()
          },
          newValue: {
            itemCode: item.code,
            warehouseCode: warehouse.code,
            countedQuantity: counted.toString(),
            quantityDelta: delta.toString(),
            adjustmentId: adjustment.id
          }
        }
      });
      importedRowCount += 1;
    }
    if (errors.length > 0) throw new Error("IMPORT_VALIDATION_FAILED");
  }).catch((error) => {
    if (error instanceof Error && error.message === "IMPORT_VALIDATION_FAILED") return;
    throw error;
  });

  if (errors.length > 0) return { importedRowCount: 0, skippedRowCount: 0, errors };
  return { importedRowCount, skippedRowCount, errors: [] };
}
