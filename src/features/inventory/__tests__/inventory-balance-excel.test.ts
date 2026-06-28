import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateInventoryBalanceTemplate, INVENTORY_BALANCE_HEADERS, parseInventoryBalanceWorkbook } from "../inventory-balance-excel";

async function workbookBuffer(rows: unknown[][], headers: readonly string[] = INVENTORY_BALANCE_HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventory Counts");
  sheet.addRow([...headers]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("inventory balance Excel template", () => {
  it("generates a stock-count template with current balances and lookup sheets", async () => {
    const buffer = await generateInventoryBalanceTemplate(
      [{
        itemCode: "FLOUR",
        nameEn: "Flour",
        warehouseCode: "WH-MAIN",
        warehouseName: "Main Warehouse",
        unit: "KG",
        currentQuantity: "12.5",
        reservedQuantity: "2.5"
      }],
      [{ code: "FLOUR", nameEn: "Flour", unit: "KG" }],
      [{ code: "WH-MAIN", name: "Main Warehouse" }]
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.getWorksheet("Inventory Counts")!;

    expect(sheet.getRow(1).values).toEqual([undefined, ...INVENTORY_BALANCE_HEADERS]);
    expect(sheet.getCell("A1").font.bold).toBe(true);
    expect(sheet.getCell("H2").dataValidation.type).toBe("decimal");
    expect(sheet.getCell("I2").dataValidation.type).toBe("list");
    expect(sheet.getCell("A2").value).toBe("FLOUR");
    expect(sheet.getCell("F2").value).toBe(12.5);
    expect(workbook.getWorksheet("Valid Items")).toBeDefined();
    expect(workbook.getWorksheet("Valid Warehouses")).toBeDefined();
  });

  it("parses valid stock-count rows", async () => {
    const buffer = await workbookBuffer([
      ["FLOUR", "Flour", "WH-MAIN", "Main Warehouse", "KG", 12.5, 2.5, 15, "STOCK_COUNT_CORRECTION", "Counted by shift A"]
    ]);
    const result = await parseInventoryBalanceWorkbook(buffer);

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      itemCode: "FLOUR",
      warehouseCode: "WH-MAIN",
      unit: "KG",
      countedQuantity: 15,
      reason: "STOCK_COUNT_CORRECTION"
    });
  });

  it("returns row-level errors for invalid counted quantities and reasons", async () => {
    const buffer = await workbookBuffer([
      ["FLOUR", "Flour", "WH-MAIN", "Main Warehouse", "KG", 12.5, 2.5, -1, "WRONG", ""]
    ]);
    const result = await parseInventoryBalanceWorkbook(buffer);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual(expect.arrayContaining([
      { row: 2, column: "Counted Quantity", message: "Counted Quantity must be greater than or equal to 0." },
      { row: 2, column: "Adjustment Reason", message: "Adjustment Reason is not allowed." }
    ]));
  });
});
