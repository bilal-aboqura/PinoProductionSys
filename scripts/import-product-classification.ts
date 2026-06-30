import fs from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { parseItemReferenceWorkbook } from "../src/features/inventory/item-reference-excel";

function numberArg(name: string, fallback: number) {
  const raw = process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  const parsed = raw == null ? fallback : Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid --${name}`);
  return parsed;
}

async function main() {
  const bulk = process.argv.includes("--bulk");
  const offset = numberArg("offset", 0);
  const limit = numberArg("limit", 25);
  const prisma = new PrismaClient();
  try {
    const file = fs.readdirSync(process.cwd()).find((name) => name.endsWith(".xlsx"));
    if (!file) throw new Error("No .xlsx product classification file found in the project root.");

    const parsed = await parseItemReferenceWorkbook(fs.readFileSync(path.join(process.cwd(), file)), "Africa/Cairo");
    if (parsed.errors.length > 0) throw new Error(JSON.stringify(parsed.errors.slice(0, 20), null, 2));

    const actor = await prisma.user.findFirst({ where: { email: "admin@pino.local" }, select: { id: true } }) ??
      await prisma.user.findFirst({ select: { id: true } });
    if (!actor) throw new Error("No user found for audit actor.");

    const rows = parsed.rows.slice(offset, offset + limit);
    if (bulk) {
      const allRows = parsed.rows;
      await prisma.inventoryCategory.createMany({
        data: [...new Set(allRows.map((row) => row.categoryName).filter(Boolean))]
          .map((name) => ({ name, description: "Imported from product classification workbook." })),
        skipDuplicates: true
      });
      const categories = await prisma.inventoryCategory.findMany({ select: { id: true, name: true } });
      const categoryByName = new Map(categories.map((category) => [category.name, category.id]));

      await prisma.inventoryItem.createMany({
        data: allRows.map((row) => ({
          code: row.itemCode,
          nameEn: row.itemName,
          nameAr: row.nameAr,
          itemType: row.itemType,
          categoryId: categoryByName.get(row.categoryName)!,
          unit: row.baseUnit,
          unitWeightKg: row.unitWeightKg == null ? null : new Prisma.Decimal(row.unitWeightKg),
          minStockLevel: new Prisma.Decimal(row.minStockLevel)
        })),
        skipDuplicates: true
      });

      const items = await prisma.inventoryItem.findMany({
        where: { code: { in: allRows.map((row) => row.itemCode) } },
        select: { id: true, code: true }
      });
      const itemByCode = new Map(items.map((item) => [item.code, item.id]));
      const existingProfiles = await prisma.ingredientReferenceProfile.findMany({
        where: { inventoryItemId: { in: items.map((item) => item.id) } },
        select: { inventoryItemId: true, effectiveAt: true }
      });
      const existingProfileKeys = new Set(existingProfiles.map((profile) => `${profile.inventoryItemId}:${profile.effectiveAt.getTime()}`));
      const profilesToCreate = allRows
        .map((row) => {
          const inventoryItemId = itemByCode.get(row.itemCode);
          if (!inventoryItemId) throw new Error(`Missing imported item ${row.itemCode}`);
          const key = `${inventoryItemId}:${row.effectiveAt.getTime()}`;
          if (existingProfileKeys.has(key)) return null;
          existingProfileKeys.add(key);
          return {
            inventoryItemId,
            costReferenceQuantity: new Prisma.Decimal(row.costReferenceQuantity),
            costReferenceUnit: row.costReferenceUnit,
            costReferenceValue: new Prisma.Decimal(row.costReferenceValue),
            calorieReferenceQuantity: new Prisma.Decimal(row.calorieReferenceQuantity),
            calorieReferenceUnit: row.calorieReferenceUnit,
            calorieValue: new Prisma.Decimal(row.calorieValue),
            effectiveAt: row.effectiveAt,
            createdById: actor.id
          };
        })
        .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
      if (profilesToCreate.length > 0) {
        await prisma.ingredientReferenceProfile.createMany({ data: profilesToCreate });
      }

      console.log(JSON.stringify({
        mode: "bulk",
        totalRows: allRows.length,
        itemCountInWorkbook: items.length,
        createdProfiles: profilesToCreate.length,
        skippedProfiles: allRows.length - profilesToCreate.length
      }));
      return;
    }

    let createdCategories = 0;
    let createdItems = 0;
    let updatedItems = 0;
    let createdProfiles = 0;
    let skippedProfiles = 0;

    for (const row of rows) {
      const existingCategory = await prisma.inventoryCategory.findUnique({ where: { name: row.categoryName }, select: { id: true } });
      const category = existingCategory ?? await prisma.inventoryCategory.create({
        data: { name: row.categoryName, description: "Imported from product classification workbook." },
        select: { id: true }
      });
      if (!existingCategory) createdCategories += 1;

      const existingItem = await prisma.inventoryItem.findUnique({ where: { code: row.itemCode }, select: { id: true } });
      const itemData = {
        nameEn: row.itemName,
        nameAr: row.nameAr,
        itemType: row.itemType,
        categoryId: category.id,
        unit: row.baseUnit,
        unitWeightKg: row.unitWeightKg == null ? null : new Prisma.Decimal(row.unitWeightKg),
        minStockLevel: new Prisma.Decimal(row.minStockLevel)
      };
      const item = existingItem
        ? await prisma.inventoryItem.update({ where: { id: existingItem.id }, data: itemData, select: { id: true } })
        : await prisma.inventoryItem.create({ data: { code: row.itemCode, ...itemData }, select: { id: true } });
      if (existingItem) updatedItems += 1;
      else createdItems += 1;

      const sameDateCount = await prisma.ingredientReferenceProfile.count({
        where: { inventoryItemId: item.id, effectiveAt: row.effectiveAt }
      });
      if (sameDateCount > 0) {
        skippedProfiles += 1;
        continue;
      }

      await prisma.ingredientReferenceProfile.create({
        data: {
          inventoryItemId: item.id,
          costReferenceQuantity: new Prisma.Decimal(row.costReferenceQuantity),
          costReferenceUnit: row.costReferenceUnit,
          costReferenceValue: new Prisma.Decimal(row.costReferenceValue),
          calorieReferenceQuantity: new Prisma.Decimal(row.calorieReferenceQuantity),
          calorieReferenceUnit: row.calorieReferenceUnit,
          calorieValue: new Prisma.Decimal(row.calorieValue),
          effectiveAt: row.effectiveAt,
          createdById: actor.id
        }
      });
      createdProfiles += 1;
    }

    console.log(JSON.stringify({
      offset,
      limit,
      processed: rows.length,
      totalRows: parsed.rows.length,
      createdCategories,
      createdItems,
      updatedItems,
      createdProfiles,
      skippedProfiles
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
