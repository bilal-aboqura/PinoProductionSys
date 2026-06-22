import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateItemReferenceTemplate, ITEM_REFERENCE_HEADERS, parseItemReferenceWorkbook } from "../item-reference-excel";
import { validateItemReferenceRows } from "../item-reference-import-service";
import type { ItemReferenceImportRow } from "../item-reference-excel";

async function workbookBuffer(rows: unknown[][], headers: readonly string[] = ITEM_REFERENCE_HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Item References");
  sheet.addRow([...headers]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("item reference Excel template", () => {
  it("generates the exact styled template with lookup data and validations", async () => {
    const buffer = await generateItemReferenceTemplate([
      { code: "SUGAR", nameEn: "Sugar", nameAr: "سكر", unit: "KG" },
      { code: "FLOUR", nameEn: "Flour", nameAr: "دقيق", unit: "GRAM" }
    ], ["Ingredients", "Packaging"]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Item References")!;

    expect(sheet.getRow(1).values).toEqual([undefined, ...ITEM_REFERENCE_HEADERS]);
    expect(sheet.getCell("A1").font.bold).toBe(true);
    expect(sheet.getCell("A1").fill).toMatchObject({ fgColor: { argb: "FFA14323" } });
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.getCell("D2").dataValidation.type).toBe("list");
    expect(sheet.getCell("F2").dataValidation.type).toBe("list");
    expect(sheet.getCell("H2").dataValidation.operator).toBe("greaterThan");
    expect(sheet.getCell("O2").numFmt).toBe("yyyy-mm-dd hh:mm");
    expect(workbook.getWorksheet("Valid Items")!.getColumn(1).values).toEqual([undefined, "Item Code", "FLOUR", "SUGAR"]);
    expect(workbook.getWorksheet("Valid Categories")!.getColumn(1).values).toEqual([undefined, "Category", "Ingredients", "Packaging"]);
    expect(workbook.getWorksheet("Instructions")).toBeDefined();
  });
});

describe("item reference Excel parser", () => {
  it("parses and sorts valid rows by item name then effective date", async () => {
    const buffer = await workbookBuffer([
      ["SUGAR", "Sugar", "", "", "", "", "", 1, "KG", 40, "EGP", 387, 100, "GRAM", "2026-06-02 09:00"],
      ["FLOUR", "Flour", "", "", "", "", "", 1, "KG", 50, "EGP", 364, 100, "GRAM", "2026-06-03 09:00"],
      ["FLOUR", "Flour", "", "", "", "", "", 1, "KG", 45, "EGP", 364, 100, "GRAM", "2026-06-01 09:00"]
    ]);
    const result = await parseItemReferenceWorkbook(buffer);

    expect(result.errors).toEqual([]);
    expect(result.rows.map((row) => `${row.itemName}:${row.effectiveAt.toISOString()}`)).toEqual([
      "Flour:2026-06-01T09:00:00.000Z",
      "Flour:2026-06-03T09:00:00.000Z",
      "Sugar:2026-06-02T09:00:00.000Z"
    ]);
  });

  it("returns precise row-level errors without returning an invalid row", async () => {
    const buffer = await workbookBuffer([
      ["FLOUR", "Flour", "", "", "", "", "", 0, "BOX", -1, "USD", "many", 0, "GRAM", "06/01/2026"]
    ]);
    const result = await parseItemReferenceWorkbook(buffer);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(expect.arrayContaining([
      { row: 2, column: "Reference Quantity", message: "Reference Quantity must be greater than 0." },
      { row: 2, column: "Reference Unit", message: "Reference Unit is not allowed." },
      { row: 2, column: "Cost", message: "Cost must be greater than or equal to 0." },
      { row: 2, column: "Cost Currency", message: "Cost Currency must be EGP." },
      { row: 2, column: "Effective Date", message: "Effective Date must use yyyy-mm-dd hh:mm or a valid Excel date." }
    ]));
  });

  it("continues to accept the original template columns for existing items", async () => {
    const legacyHeaders = ITEM_REFERENCE_HEADERS.filter((header) => !["Arabic Item Name", "Item Type", "Category", "Base Unit", "Minimum Stock"].includes(header));
    const buffer = await workbookBuffer([
      ["FLOUR", "Flour", 1, "KG", 50, "EGP", 364, 100, "GRAM", "2026-06-01 09:00"]
    ], legacyHeaders);
    const result = await parseItemReferenceWorkbook(buffer);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ nameAr: "Flour", itemType: "RAW_MATERIAL", baseUnit: "KG", minStockLevel: 0 });
  });

  it("interprets Excel wall-clock dates in the configured system timezone", async () => {
    const buffer = await workbookBuffer([
      ["FLOUR", "Flour", "", "", "", "", "", 1, "KG", 50, "EGP", 364, 100, "GRAM", new Date(Date.UTC(2026, 5, 23, 0, 0))]
    ]);
    const result = await parseItemReferenceWorkbook(buffer, "Africa/Cairo");

    expect(result.errors).toEqual([]);
    expect(result.rows[0].effectiveAt.toISOString()).toBe("2026-06-22T21:00:00.000Z");
  });

  it("rejects workbooks that do not have the exact required headers", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Item References");
    sheet.addRow(["Item Code", "Wrong Column"]);
    const result = await parseItemReferenceWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));

    expect(result.rows).toEqual([]);
    expect(result.errors.some((error) => error.message === "Missing required column: Item Name.")).toBe(true);
    expect(result.errors.some((error) => error.message === "Unexpected column: Wrong Column.")).toBe(true);
  });
});

describe("item reference import validation", () => {
  const validRow: ItemReferenceImportRow = {
    rowNumber: 2,
    itemCode: "FLOUR",
    itemName: "Flour",
    nameAr: "دقيق",
    itemType: "RAW_MATERIAL",
    categoryName: "Ingredients",
    baseUnit: "KG",
    minStockLevel: 0,
    costReferenceQuantity: 1,
    costReferenceUnit: "KG",
    costReferenceValue: 50,
    costCurrency: "EGP",
    calorieValue: 364,
    calorieReferenceQuantity: 100,
    calorieReferenceUnit: "GRAM",
    effectiveAt: new Date("2026-06-01T09:00:00.000Z")
  };
  const item = {
    id: "item-1",
    code: "FLOUR",
    nameEn: "Flour",
    nameAr: "دقيق",
    unit: "KG" as const,
    isActive: true,
    ingredientReferenceProfiles: []
  };

  it("accepts a valid reference for an existing active item", () => {
    expect(validateItemReferenceRows([validRow], [item])).toEqual([]);
  });

  it("accepts a complete new item row and applies parsed defaults", () => {
    const newRow = { ...validRow, itemCode: "NEW-77", itemName: "New Item", nameAr: "New Item" };
    expect(validateItemReferenceRows([newRow], [], [{ id: "category-1", name: "Ingredients" }])).toEqual([]);
  });

  it("reports catalog, unit-family, duplicate, and immutability errors", () => {
    const duplicateRow = { ...validRow, rowNumber: 3, itemName: "Wrong name", costReferenceUnit: "LITER" as const, calorieReferenceUnit: "GRAM" as const };
    const errors = validateItemReferenceRows(
      [validRow, duplicateRow, { ...validRow, rowNumber: 4, itemCode: "MISSING" }],
      [{ ...item, ingredientReferenceProfiles: [{ effectiveAt: validRow.effectiveAt }] }]
    );

    expect(errors.map((error) => error.column)).toEqual(expect.arrayContaining([
      "Effective Date",
      "Item Name",
      "Reference Unit",
      "Calorie Reference Unit",
      "Category"
    ]));
    expect(errors.some((error) => error.message.includes("Previous references are immutable"))).toBe(true);
    expect(errors.some((error) => error.message.includes("Duplicates row 2"))).toBe(true);
  });
});
