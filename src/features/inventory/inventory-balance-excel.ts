import ExcelJS from "exceljs";
import type { AdjustmentReason, Unit } from "@prisma/client";

export const INVENTORY_BALANCE_HEADERS = [
  "Item Code",
  "Item Name",
  "Warehouse Code",
  "Warehouse Name",
  "Unit",
  "Current Quantity",
  "Reserved Quantity",
  "Counted Quantity",
  "Adjustment Reason",
  "Notes"
] as const;

export const INVENTORY_BALANCE_REASONS = ["STOCK_COUNT_CORRECTION", "DAMAGED_GOODS", "INVENTORY_RECONCILIATION", "LOST_MATERIALS"] as const satisfies readonly AdjustmentReason[];
export const INVENTORY_BALANCE_MAX_ROWS = 1000;

export type InventoryBalanceImportColumn = (typeof INVENTORY_BALANCE_HEADERS)[number] | "Header" | "Workbook";

export type InventoryBalanceImportError = {
  row: number;
  column: InventoryBalanceImportColumn;
  message: string;
};

export type InventoryBalanceImportRow = {
  rowNumber: number;
  itemCode: string;
  itemName: string;
  warehouseCode: string;
  warehouseName: string;
  unit: Unit;
  currentQuantity: number | null;
  reservedQuantity: number | null;
  countedQuantity: number;
  reason: AdjustmentReason;
  notes: string | null;
};

type TemplateBalance = {
  itemCode: string;
  nameEn: string;
  warehouseCode: string;
  warehouseName: string;
  unit: Unit;
  currentQuantity: string;
  reservedQuantity: string;
};

type TemplateItem = { code: string; nameEn: string; unit: Unit };
type TemplateWarehouse = { code: string; name: string };

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA14323" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FF665936" } } };
  });
}

export async function generateInventoryBalanceTemplate(
  balances: TemplateBalance[],
  items: TemplateItem[],
  warehouses: TemplateWarehouse[],
  locale = "en"
) {
  const arabic = locale === "ar";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pino Production System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Inventory stock count import template";

  const sheet = workbook.addWorksheet("Inventory Counts", {
    properties: { tabColor: { argb: "FFA14323" } },
    views: [{ state: "frozen", ySplit: 1 }]
  });
  sheet.addRow([...INVENTORY_BALANCE_HEADERS]);
  styleHeader(sheet.getRow(1));
  sheet.autoFilter = `A1:J${INVENTORY_BALANCE_MAX_ROWS + 1}`;

  if (balances.length > 0) {
    balances.forEach((balance) => {
      sheet.addRow([
        balance.itemCode,
        balance.nameEn,
        balance.warehouseCode,
        balance.warehouseName,
        balance.unit,
        Number(balance.currentQuantity),
        Number(balance.reservedQuantity),
        "",
        "STOCK_COUNT_CORRECTION",
        ""
      ]);
    });
  } else {
    const firstItem = items[0];
    const firstWarehouse = warehouses[0];
    const example = sheet.addRow([
      firstItem?.code ?? "EXAMPLE-ITEM",
      firstItem?.nameEn ?? "Example Item",
      firstWarehouse?.code ?? "WH-MAIN",
      firstWarehouse?.name ?? "Main Warehouse",
      firstItem?.unit ?? "KG",
      0,
      0,
      10,
      "STOCK_COUNT_CORRECTION",
      "Example only. Delete before import."
    ]);
    example.eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF665936" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4DB" } };
    });
  }

  const widths = [18, 28, 18, 28, 14, 18, 18, 18, 28, 36];
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  for (const column of [6, 7, 8]) sheet.getColumn(column).numFmt = "0.000";

  const lastEditableRow = INVENTORY_BALANCE_MAX_ROWS + 1;
  for (let row = 2; row <= lastEditableRow; row += 1) {
    sheet.getCell(row, 8).dataValidation = {
      type: "decimal",
      operator: "greaterThanOrEqual",
      allowBlank: false,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: "Invalid counted quantity",
      error: "Enter a counted quantity greater than or equal to 0."
    };
    sheet.getCell(row, 9).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`"${INVENTORY_BALANCE_REASONS.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Invalid reason",
      error: "Choose a valid adjustment reason."
    };
  }

  const validItems = workbook.addWorksheet("Valid Items", { views: [{ state: "frozen", ySplit: 1 }] });
  validItems.addRow(["Item Code", "Item Name", "Unit"]);
  styleHeader(validItems.getRow(1));
  items
    .slice()
    .sort((left, right) => left.nameEn.localeCompare(right.nameEn) || left.code.localeCompare(right.code))
    .forEach((item) => validItems.addRow([item.code, item.nameEn, item.unit]));
  validItems.columns = [{ width: 20 }, { width: 34 }, { width: 14 }];

  const validWarehouses = workbook.addWorksheet("Valid Warehouses", { views: [{ state: "frozen", ySplit: 1 }] });
  validWarehouses.addRow(["Warehouse Code", "Warehouse Name"]);
  styleHeader(validWarehouses.getRow(1));
  warehouses
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name) || left.code.localeCompare(right.code))
    .forEach((warehouse) => validWarehouses.addRow([warehouse.code, warehouse.name]));
  validWarehouses.columns = [{ width: 20 }, { width: 34 }];

  const instructions = workbook.addWorksheet(arabic ? "تعليمات" : "Instructions");
  instructions.getColumn(1).width = 110;
  instructions.getCell("A1").value = arabic ? "تعليمات استيراد جرد المخزون" : "Inventory Count Import Instructions";
  instructions.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFA14323" } };
  const lines = arabic
    ? [
        "1. اكتب الكمية المعدودة فعلياً في عمود Counted Quantity.",
        "2. النظام سيحسب الفرق بين Current Quantity و Counted Quantity وينشئ Adjustment تلقائياً.",
        "3. لا يمكن أن تكون Counted Quantity أقل من الكمية المحجوزة Reserved Quantity.",
        "4. يمكن إضافة صفوف لصنف/مخزن غير موجود في الرصيد الحالي بشرط استخدام الأكواد الموجودة في أوراق Valid Items و Valid Warehouses.",
        `5. الحد الأقصى للاستيراد هو ${INVENTORY_BALANCE_MAX_ROWS} صف.`
      ]
    : [
        "1. Enter the physical stock count in Counted Quantity.",
        "2. The system calculates the delta from Current Quantity and creates inventory adjustments automatically.",
        "3. Counted Quantity cannot be lower than Reserved Quantity.",
        "4. You may add item/warehouse rows that do not have an existing balance by using codes from Valid Items and Valid Warehouses.",
        `5. The maximum import size is ${INVENTORY_BALANCE_MAX_ROWS} rows.`
      ];
  lines.forEach((line, index) => {
    const cell = instructions.getCell(index + 3, 1);
    cell.value = line;
    cell.alignment = { wrapText: true, horizontal: arabic ? "right" : "left" };
    instructions.getRow(index + 3).height = line.length > 100 ? 34 : 22;
  });
  instructions.views = [{ rightToLeft: arabic }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function rawCellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    if ("result" in value) return value.result;
    if ("richText" in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
    if ("text" in value) return value.text;
  }
  return value;
}

function textValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function parseInventoryBalanceWorkbook(buffer: Buffer): Promise<{ rows: InventoryBalanceImportRow[]; errors: InventoryBalanceImportError[] }> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return { rows: [], errors: [{ row: 0, column: "Workbook", message: "The file is not a readable Excel workbook." }] };
  }
  const sheet = workbook.getWorksheet("Inventory Counts") ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], errors: [{ row: 0, column: "Workbook", message: "The workbook does not contain a worksheet." }] };

  const errors: InventoryBalanceImportError[] = [];
  const columnIndexes = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = textValue(rawCellValue(cell));
    if (header) columnIndexes.set(header, columnNumber);
  });
  for (const header of INVENTORY_BALANCE_HEADERS) {
    if (!columnIndexes.has(header)) errors.push({ row: 1, column: "Header", message: `Missing required column: ${header}.` });
  }
  const unexpected = [...columnIndexes.keys()].filter((header) => !INVENTORY_BALANCE_HEADERS.includes(header as (typeof INVENTORY_BALANCE_HEADERS)[number]));
  unexpected.forEach((header) => errors.push({ row: 1, column: "Header", message: `Unexpected column: ${header}.` }));
  if (errors.length > 0) return { rows: [], errors };

  const rows: InventoryBalanceImportRow[] = [];
  const rowLimit = Math.min(sheet.rowCount, INVENTORY_BALANCE_MAX_ROWS + 2);
  const valueAt = (row: ExcelJS.Row, header: (typeof INVENTORY_BALANCE_HEADERS)[number]) => rawCellValue(row.getCell(columnIndexes.get(header)!));

  for (let rowNumber = 2; rowNumber <= rowLimit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = INVENTORY_BALANCE_HEADERS.map((header) => valueAt(row, header));
    if (values.every((value) => textValue(value) === "")) continue;

    const itemCode = textValue(valueAt(row, "Item Code")).toUpperCase();
    const itemName = textValue(valueAt(row, "Item Name"));
    const warehouseCode = textValue(valueAt(row, "Warehouse Code")).toUpperCase();
    const warehouseName = textValue(valueAt(row, "Warehouse Name"));
    const unit = textValue(valueAt(row, "Unit")).toUpperCase();
    const currentQuantity = textValue(valueAt(row, "Current Quantity")) === "" ? null : numberValue(valueAt(row, "Current Quantity"));
    const reservedQuantity = textValue(valueAt(row, "Reserved Quantity")) === "" ? null : numberValue(valueAt(row, "Reserved Quantity"));
    const countedQuantity = numberValue(valueAt(row, "Counted Quantity"));
    const reason = textValue(valueAt(row, "Adjustment Reason")).toUpperCase() || "STOCK_COUNT_CORRECTION";
    const notes = textValue(valueAt(row, "Notes")) || null;
    const rowErrors: InventoryBalanceImportError[] = [];
    const add = (column: InventoryBalanceImportColumn, message: string) => rowErrors.push({ row: rowNumber, column, message });

    if (!itemCode) add("Item Code", "Item Code is required.");
    if (!warehouseCode) add("Warehouse Code", "Warehouse Code is required.");
    if (!unit) add("Unit", "Unit is required.");
    if (currentQuantity == null && textValue(valueAt(row, "Current Quantity")) !== "") add("Current Quantity", "Current Quantity must be numeric.");
    if (reservedQuantity == null && textValue(valueAt(row, "Reserved Quantity")) !== "") add("Reserved Quantity", "Reserved Quantity must be numeric.");
    if (countedQuantity == null) add("Counted Quantity", "Counted Quantity is required and must be numeric.");
    else if (countedQuantity < 0) add("Counted Quantity", "Counted Quantity must be greater than or equal to 0.");
    if (!INVENTORY_BALANCE_REASONS.includes(reason as AdjustmentReason)) add("Adjustment Reason", "Adjustment Reason is not allowed.");
    if (notes && notes.length > 1000) add("Notes", "Notes must be 1000 characters or fewer.");

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    rows.push({
      rowNumber,
      itemCode,
      itemName,
      warehouseCode,
      warehouseName,
      unit: unit as Unit,
      currentQuantity,
      reservedQuantity,
      countedQuantity: countedQuantity!,
      reason: reason as AdjustmentReason,
      notes
    });
  }

  if (sheet.rowCount > INVENTORY_BALANCE_MAX_ROWS + 1) {
    errors.push({ row: INVENTORY_BALANCE_MAX_ROWS + 2, column: "Workbook", message: `A maximum of ${INVENTORY_BALANCE_MAX_ROWS} data rows can be imported.` });
  }
  if (rows.length === 0 && errors.length === 0) errors.push({ row: 0, column: "Workbook", message: "The workbook does not contain any data rows." });
  return { rows, errors };
}
