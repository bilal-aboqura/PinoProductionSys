import { Prisma, type ItemType, type Unit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createItemSchema, ingredientReferenceProfileSchema } from "./validation";
import type { ItemReferenceImportColumn, ItemReferenceImportError, ItemReferenceImportRow } from "./item-reference-excel";

const columnForField: Record<string, ItemReferenceImportColumn> = {
  code: "Item Code",
  nameEn: "Item Name",
  nameAr: "Arabic Item Name",
  itemType: "Item Type",
  categoryId: "Category",
  unit: "Base Unit",
  unitWeightKg: "Unit Weight (kg)",
  minStockLevel: "Minimum Stock",
  costReferenceQuantity: "Reference Quantity",
  costReferenceUnit: "Reference Unit",
  costReferenceValue: "Cost",
  calorieValue: "Calories",
  calorieReferenceQuantity: "Calorie Reference Quantity",
  calorieReferenceUnit: "Calorie Reference Unit",
  effectiveAt: "Effective Date"
};

function unitFamily(unit: Unit) {
  if (unit === "PIECE") return "piece";
  if (unit === "KG" || unit === "GRAM") return "weight";
  return "volume";
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase();
}

export type ImportableReferenceItem = {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  itemType: ItemType;
  unit: Unit;
  unitWeightKg?: Prisma.Decimal | null;
  isActive: boolean;
  ingredientReferenceProfiles: { effectiveAt: Date }[];
};

export type ImportableCategory = { id: string; name: string };

function sameNewItemDetails(left: ItemReferenceImportRow, right: ItemReferenceImportRow) {
  return left.itemName === right.itemName && left.nameAr === right.nameAr && left.itemType === right.itemType &&
    normalizedName(left.categoryName) === normalizedName(right.categoryName) && left.baseUnit === right.baseUnit &&
    left.unitWeightKg === right.unitWeightKg && left.minStockLevel === right.minStockLevel;
}

export function validateItemReferenceRows(
  rows: ItemReferenceImportRow[],
  items: ImportableReferenceItem[],
  categories: ImportableCategory[] = []
) {
  const itemByCode = new Map(items.map((item) => [item.code, item]));
  const categoryByName = new Map(categories.map((category) => [normalizedName(category.name), category]));
  const errors: ItemReferenceImportError[] = [];
  const workbookKeys = new Map<string, number>();
  const newItemRows = new Map<string, ItemReferenceImportRow>();

  for (const row of rows) {
    const item = itemByCode.get(row.itemCode);
    let inventoryItemId: string;
    let baseUnit: Unit;
    if (item) {
      inventoryItemId = item.id;
      baseUnit = item.unit;
      if (!item.isActive) errors.push({ row: row.rowNumber, column: "Item Code", message: `Item code ${row.itemCode} is inactive.` });
      const suppliedName = normalizedName(row.itemName);
      if (suppliedName !== normalizedName(item.nameEn) && suppliedName !== normalizedName(item.nameAr)) {
        errors.push({ row: row.rowNumber, column: "Item Name", message: `Item Name does not match item code ${row.itemCode}.` });
      }
    } else {
      inventoryItemId = `new:${row.itemCode}`;
      baseUnit = row.baseUnit;
      const category = categoryByName.get(normalizedName(row.categoryName));
      if (!row.categoryName) {
        errors.push({ row: row.rowNumber, column: "Category", message: `Category is required to create new item ${row.itemCode}.` });
      } else if (!category && !row.allowCreateCategory) {
        errors.push({ row: row.rowNumber, column: "Category", message: `Category ${row.categoryName} does not exist.` });
      }
      const parsedItem = createItemSchema.safeParse({
        code: row.itemCode,
        nameEn: row.itemName,
        nameAr: row.nameAr,
        itemType: row.itemType,
        categoryId: category?.id ?? "",
        unit: row.baseUnit,
        unitWeightKg: row.unitWeightKg,
        minStockLevel: row.minStockLevel
      });
      if (!parsedItem.success) {
        parsedItem.error.issues.forEach((issue) => {
          const field = String(issue.path[0] ?? "Workbook");
          if (field === "categoryId" && (!row.categoryName || !category)) return;
          errors.push({ row: row.rowNumber, column: columnForField[field] ?? "Workbook", message: issue.message });
        });
      }
      const firstRow = newItemRows.get(row.itemCode);
      if (firstRow && !sameNewItemDetails(firstRow, row)) {
        errors.push({ row: row.rowNumber, column: "Item Code", message: `All rows for new item ${row.itemCode} must use the same item details as row ${firstRow.rowNumber}.` });
      } else if (!firstRow) newItemRows.set(row.itemCode, row);
    }

    const itemUnitWeightKg = item?.unitWeightKg ?? (row.unitWeightKg == null ? null : new Prisma.Decimal(row.unitWeightKg));
    const canUsePieceWeight = baseUnit === "PIECE" && itemUnitWeightKg?.gt(0) && unitFamily(row.costReferenceUnit) === "weight";
    if (!row.allowCreateCategory && unitFamily(baseUnit) !== unitFamily(row.costReferenceUnit) && !canUsePieceWeight) {
      errors.push({ row: row.rowNumber, column: "Reference Unit", message: `Reference Unit is incompatible with the item's base unit (${baseUnit}).` });
    }
    const parsedReference = ingredientReferenceProfileSchema.safeParse({
      inventoryItemId,
      costReferenceQuantity: row.costReferenceQuantity,
      costReferenceUnit: row.costReferenceUnit,
      costReferenceValue: row.costReferenceValue,
      calorieReferenceQuantity: row.calorieReferenceQuantity,
      calorieReferenceUnit: row.calorieReferenceUnit,
      calorieValue: row.calorieValue,
      effectiveAt: row.effectiveAt
    });
    if (!parsedReference.success) {
      parsedReference.error.issues.forEach((issue) => {
        const field = String(issue.path[0] ?? "Workbook");
        errors.push({ row: row.rowNumber, column: columnForField[field] ?? "Workbook", message: issue.message });
      });
    }

    const key = `${row.itemCode}:${row.effectiveAt.getTime()}`;
    const previousRow = workbookKeys.get(key);
    if (previousRow) {
      errors.push({ row: row.rowNumber, column: "Effective Date", message: `Duplicates row ${previousRow} for the same item and effective date.` });
    } else workbookKeys.set(key, row.rowNumber);
    if (item?.ingredientReferenceProfiles.some((profile) => profile.effectiveAt.getTime() === row.effectiveAt.getTime())) {
      errors.push({ row: row.rowNumber, column: "Effective Date", message: "A reference already exists for this item and effective date. Previous references are immutable." });
    }
  }
  return errors.sort((left, right) => left.row - right.row);
}

export async function importItemReferenceRows(rows: ItemReferenceImportRow[], actorId: string) {
  const codes = [...new Set(rows.map((row) => row.itemCode))];
  const [items, categories] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { code: { in: codes } },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameAr: true,
        itemType: true,
        unit: true,
        unitWeightKg: true,
        isActive: true,
        ingredientReferenceProfiles: { select: { effectiveAt: true } }
      }
    }),
    prisma.inventoryCategory.findMany({ select: { id: true, name: true } })
  ]);
  const errors = validateItemReferenceRows(rows, items, categories);
  if (errors.length > 0) return { importedRowCount: 0, createdItemCount: 0, errors };

  const existingItemByCode = new Map(items.map((item) => [item.code, item]));
  const categoryByName = new Map(categories.map((category) => [normalizedName(category.name), category]));
  const firstRowByCode = new Map<string, ItemReferenceImportRow>();
  rows.forEach((row) => { if (!firstRowByCode.has(row.itemCode)) firstRowByCode.set(row.itemCode, row); });
  let createdItemCount = 0;

  await prisma.$transaction(async (tx) => {
    const missingCategories = [...new Set(rows.filter((row) => row.allowCreateCategory && row.categoryName && !categoryByName.has(normalizedName(row.categoryName))).map((row) => row.categoryName))];
    for (const name of missingCategories) {
      const createdCategory = await tx.inventoryCategory.create({ data: { name, description: "Imported from product classification workbook." } });
      categoryByName.set(normalizedName(createdCategory.name), { id: createdCategory.id, name: createdCategory.name });
    }

    const importedItemByCode = new Map<string, { id: string; code: string; unit: Unit; itemType: ItemType }>();
    for (const [code, row] of firstRowByCode) {
      const existing = existingItemByCode.get(code);
      if (existing) {
        if (row.unitWeightKg != null && (!existing.unitWeightKg || !existing.unitWeightKg.equals(row.unitWeightKg))) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { unitWeightKg: new Prisma.Decimal(row.unitWeightKg) }
          });
          await tx.inventoryAuditLog.create({
            data: {
              actorId,
              action: "ITEM_UNIT_WEIGHT_IMPORT_UPDATE",
              targetId: existing.id,
              previousValue: { unitWeightKg: existing.unitWeightKg?.toString() ?? null },
              newValue: { unitWeightKg: row.unitWeightKg }
            }
          });
        }
        importedItemByCode.set(code, { id: existing.id, code: existing.code, unit: existing.unit, itemType: existing.itemType });
        continue;
      }
      const category = categoryByName.get(normalizedName(row.categoryName))!;
      const created = await tx.inventoryItem.create({
        data: {
          code: row.itemCode,
          nameEn: row.itemName,
          nameAr: row.nameAr,
          itemType: row.itemType,
          categoryId: category.id,
          unit: row.baseUnit,
          unitWeightKg: row.unitWeightKg == null ? null : new Prisma.Decimal(row.unitWeightKg),
          minStockLevel: new Prisma.Decimal(row.minStockLevel)
        }
      });
      importedItemByCode.set(code, { id: created.id, code: created.code, unit: created.unit, itemType: created.itemType });
      createdItemCount += 1;
      await tx.inventoryAuditLog.create({
        data: {
          actorId,
          action: "ITEM_IMPORT_CREATE",
          targetId: created.id,
          previousValue: Prisma.JsonNull,
          newValue: {
            code: created.code,
            nameEn: created.nameEn,
            nameAr: created.nameAr,
            itemType: created.itemType,
            categoryId: created.categoryId,
            unit: created.unit,
            unitWeightKg: row.unitWeightKg,
            minStockLevel: row.minStockLevel
          }
        }
      });
    }

    for (const row of rows) {
      const item = importedItemByCode.get(row.itemCode)!;
      const created = await tx.ingredientReferenceProfile.create({
        data: {
          inventoryItemId: item.id,
          costReferenceQuantity: new Prisma.Decimal(row.costReferenceQuantity),
          costReferenceUnit: row.costReferenceUnit,
          costReferenceValue: new Prisma.Decimal(row.costReferenceValue),
          calorieReferenceQuantity: new Prisma.Decimal(row.calorieReferenceQuantity),
          calorieReferenceUnit: row.calorieReferenceUnit,
          calorieValue: new Prisma.Decimal(row.calorieValue),
          effectiveAt: row.effectiveAt,
          createdById: actorId
        }
      });
      await tx.inventoryAuditLog.create({
        data: {
          actorId,
          action: "INGREDIENT_REFERENCE_PROFILE_IMPORT",
          targetId: item.id,
          previousValue: Prisma.JsonNull,
          newValue: {
            id: created.id,
            inventoryItemId: item.id,
            costReferenceQuantity: row.costReferenceQuantity,
            costReferenceUnit: row.costReferenceUnit,
            costReferenceValue: row.costReferenceValue,
            calorieReferenceQuantity: row.calorieReferenceQuantity,
            calorieReferenceUnit: row.calorieReferenceUnit,
            calorieValue: row.calorieValue,
            effectiveAt: row.effectiveAt.toISOString()
          }
        }
      });
    }
  });
  return { importedRowCount: rows.length, createdItemCount, errors: [] };
}
