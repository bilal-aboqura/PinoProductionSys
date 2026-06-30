import ExcelJS from "exceljs";
import type { ItemType, Unit } from "@prisma/client";

export const ITEM_REFERENCE_HEADERS = [
  "Item Code",
  "Item Name",
  "Arabic Item Name",
  "Item Type",
  "Category",
  "Base Unit",
  "Unit Weight (kg)",
  "Minimum Stock",
  "Reference Quantity",
  "Reference Unit",
  "Cost",
  "Cost Currency",
  "Calories",
  "Calorie Reference Quantity",
  "Calorie Reference Unit",
  "Effective Date"
] as const;

const LEGACY_REQUIRED_HEADERS = [
  "Item Code",
  "Item Name",
  "Reference Quantity",
  "Reference Unit",
  "Cost",
  "Cost Currency",
  "Calories",
  "Calorie Reference Quantity",
  "Calorie Reference Unit",
  "Effective Date"
] as const;

export const ITEM_REFERENCE_UNITS = ["KG", "GRAM", "LITER", "MILLILITER", "PIECE"] as const satisfies readonly Unit[];
export const ITEM_REFERENCE_MAX_ROWS = 1000;

export type ItemReferenceImportColumn = (typeof ITEM_REFERENCE_HEADERS)[number] | "Header" | "Workbook";

export type ItemReferenceImportError = {
  row: number;
  column: ItemReferenceImportColumn;
  message: string;
};

export type ItemReferenceImportRow = {
  rowNumber: number;
  itemCode: string;
  itemName: string;
  nameAr: string;
  itemType: ItemType;
  categoryName: string;
  baseUnit: Unit;
  unitWeightKg: number | null;
  minStockLevel: number;
  costReferenceQuantity: number;
  costReferenceUnit: Unit;
  costReferenceValue: number;
  costCurrency: "SAR";
  calorieValue: number;
  calorieReferenceQuantity: number;
  calorieReferenceUnit: Unit;
  effectiveAt: Date;
  allowCreateCategory?: boolean;
};

type TemplateItem = { code: string; nameEn: string; nameAr: string; unit: Unit; unitWeightKg?: string | number | null; itemType?: ItemType; categoryName?: string };

const headerByField = {
  itemCode: "Item Code",
  itemName: "Item Name",
  nameAr: "Arabic Item Name",
  itemType: "Item Type",
  categoryName: "Category",
  baseUnit: "Base Unit",
  unitWeightKg: "Unit Weight (kg)",
  minStockLevel: "Minimum Stock",
  costReferenceQuantity: "Reference Quantity",
  costReferenceUnit: "Reference Unit",
  costReferenceValue: "Cost",
  costCurrency: "Cost Currency",
  calorieValue: "Calories",
  calorieReferenceQuantity: "Calorie Reference Quantity",
  calorieReferenceUnit: "Calorie Reference Unit",
  effectiveAt: "Effective Date"
} as const;

function styleHeader(row: ExcelJS.Row) {
  row.height = 28;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA14323" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FF665936" } } };
    cell.protection = { locked: true };
  });
}

export async function generateItemReferenceTemplate(items: TemplateItem[], categories: string[] = [], locale = "en") {
  const arabic = locale === "ar";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pino Production System";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Inventory item cost and calorie reference import template";

  const sheet = workbook.addWorksheet("Item References", {
    properties: { tabColor: { argb: "FFA14323" } },
    views: [{ state: "frozen", ySplit: 1 }]
  });
  sheet.addRow([...ITEM_REFERENCE_HEADERS]);
  styleHeader(sheet.getRow(1));
  sheet.autoFilter = `A1:P${ITEM_REFERENCE_MAX_ROWS + 1}`;

  const exampleRow = sheet.addRow([
    "EXAMPLE-ITEM",
    "Example Flour",
    "دقيق مثال",
    "RAW_MATERIAL",
    categories[0] ?? "Ingredients",
    "KG",
    "",
    0,
    1,
    "KG",
    50,
    "SAR",
    364,
    100,
    "GRAM",
    new Date(Date.UTC(2026, 0, 1, 8, 0))
  ]);
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF665936" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4DB" } };
    cell.protection = { locked: false };
  });
  exampleRow.getCell(1).note = arabic
    ? "صف مثال فقط. احذفه قبل الاستيراد. يمكن استخدام رمز موجود أو إنشاء صنف جديد مع تحديد الفئة."
    : "Example only. Delete this row before import. You may use an existing code or create a new item by providing its category.";

  const widths = [18, 28, 28, 20, 24, 16, 18, 18, 20, 18, 14, 18, 14, 28, 26, 22];
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.getColumn(7).numFmt = "0.000";
  sheet.getColumn(8).numFmt = "0.000";
  sheet.getColumn(9).numFmt = "0.000";
  sheet.getColumn(11).numFmt = "0.00";
  sheet.getColumn(13).numFmt = "0.00";
  sheet.getColumn(14).numFmt = "0.000";
  sheet.getColumn(16).numFmt = "yyyy-mm-dd hh:mm";

  const lastEditableRow = ITEM_REFERENCE_MAX_ROWS + 1;
  for (const column of [6, 10, 15]) {
    sheet.getCell(2, column).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: [`"${ITEM_REFERENCE_UNITS.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "Invalid unit",
      error: "Choose KG, GRAM, LITER, MILLILITER, or PIECE."
    };
    for (let row = 3; row <= lastEditableRow; row += 1) sheet.getCell(row, column).dataValidation = sheet.getCell(2, column).dataValidation;
  }
  for (const column of [9, 14]) {
    for (let row = 2; row <= lastEditableRow; row += 1) {
      sheet.getCell(row, column).dataValidation = {
        type: "decimal",
        operator: "greaterThan",
        allowBlank: false,
        formulae: [0],
        showErrorMessage: true,
        errorTitle: "Invalid quantity",
        error: "Enter a number greater than 0."
      };
    }
  }
  for (const column of [7, 8, 11, 13]) {
    for (let row = 2; row <= lastEditableRow; row += 1) {
      sheet.getCell(row, column).dataValidation = {
        type: "decimal",
        operator: "greaterThanOrEqual",
        allowBlank: column === 7,
        formulae: [0],
        showErrorMessage: true,
        errorTitle: "Invalid value",
        error: "Enter a number greater than or equal to 0."
      };
    }
  }
  for (let row = 2; row <= lastEditableRow; row += 1) {
    sheet.getCell(row, 4).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"RAW_MATERIAL,TRANSFORMATION_MATERIAL,FINISHED_PRODUCT"'],
      showErrorMessage: true,
      errorTitle: "Invalid item type",
      error: "Choose RAW_MATERIAL, TRANSFORMATION_MATERIAL, or FINISHED_PRODUCT."
    };
    if (categories.length > 0 && categories.join(",").length <= 220 && categories.every((category) => !category.includes(","))) {
      sheet.getCell(row, 5).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${categories.join(",")}"`],
        showErrorMessage: true,
        errorTitle: "Invalid category",
        error: "Choose a category used by the system."
      };
    }
    sheet.getCell(row, 12).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"SAR"'],
      showErrorMessage: true,
      errorTitle: "Invalid currency",
      error: "The supported currency is SAR."
    };
    sheet.getCell(row, 16).dataValidation = {
      type: "date",
      operator: "between",
      allowBlank: false,
      formulae: [new Date(Date.UTC(2000, 0, 1)), new Date(Date.UTC(2100, 11, 31))],
      showErrorMessage: true,
      errorTitle: "Invalid date",
      error: "Enter a date between 2000-01-01 and 2100-12-31."
    };
  }

  const validItems = workbook.addWorksheet("Valid Items", { views: [{ state: "frozen", ySplit: 1 }] });
  validItems.addRow(["Item Code", "English Item Name", "Arabic Item Name", "Item Type", "Category", "Base Unit", "Unit Weight (kg)"]);
  styleHeader(validItems.getRow(1));
  items
    .slice()
    .sort((left, right) => left.nameEn.localeCompare(right.nameEn) || left.code.localeCompare(right.code))
    .forEach((item) => validItems.addRow([item.code, item.nameEn, item.nameAr, item.itemType ?? "", item.categoryName ?? "", item.unit, item.unitWeightKg ?? ""]));
  validItems.columns = [{ width: 20 }, { width: 32 }, { width: 32 }, { width: 20 }, { width: 26 }, { width: 16 }, { width: 18 }];
  validItems.autoFilter = `A1:G${Math.max(2, items.length + 1)}`;

  const validCategories = workbook.addWorksheet("Valid Categories", { views: [{ state: "frozen", ySplit: 1 }] });
  validCategories.addRow(["Category"]);
  styleHeader(validCategories.getRow(1));
  categories.slice().sort((left, right) => left.localeCompare(right)).forEach((category) => validCategories.addRow([category]));
  validCategories.getColumn(1).width = 36;

  const instructions = workbook.addWorksheet(arabic ? "تعليمات" : "Instructions");
  instructions.getColumn(1).width = 110;
  instructions.getCell("A1").value = arabic ? "تعليمات استيراد مراجع التكلفة والسعرات" : "Cost & Calorie Reference Import Instructions";
  instructions.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFA14323" } };
  const lines = arabic
    ? [
        "1. احذف صف المثال من ورقة Item References.",
        "2. للصنف الموجود: استخدم رمزًا واسمًا مطابقين لورقة Valid Items، ويمكن ترك أعمدة بيانات الصنف الجديدة فارغة.",
        "3. للصنف الجديد: الفئة مطلوبة. الاسم العربي افتراضيًا يساوي اسم الصنف، والنوع الافتراضي RAW_MATERIAL، ويمكن أيضًا استخدام TRANSFORMATION_MATERIAL أو FINISHED_PRODUCT، والوحدة الأساسية هي الوحدة المرجعية، والحد الأدنى صفر.",
        "4. استخدم الوحدات المتاحة فقط، واكتب التاريخ بصيغة yyyy-mm-dd hh:mm.",
        "5. تظل المراجع السابقة ثابتة؛ لا يمكن استيراد نفس الصنف وتاريخ السريان مرتين.",
        `6. الحد الأقصى هو ${ITEM_REFERENCE_MAX_ROWS} صف.`
      ]
    : [
        "1. Delete the example row from the Item References sheet.",
        "2. Existing item: match the code and name in Valid Items; the new item-detail columns may be blank.",
        "3. New item: Category is required. Arabic name defaults to Item Name, Item Type defaults to RAW_MATERIAL, you may also use TRANSFORMATION_MATERIAL or FINISHED_PRODUCT, Base Unit defaults to Reference Unit, and Minimum Stock to 0.",
        "4. Use only the available units and enter dates as yyyy-mm-dd hh:mm.",
        "5. Previous references remain immutable; the same item and effective date cannot be imported twice.",
        `6. The maximum import size is ${ITEM_REFERENCE_MAX_ROWS} rows.`
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

function dateTimeInZone(parts: { year: number; month: number; day: number; hour: number; minute: number; second: number }, timeZone: string) {
  const wallClockUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    });
  } catch {
    return new Date(wallClockUtc);
  }
  const offsetAt = (instant: Date) => {
    const formatted = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]));
    return Date.UTC(
      Number(formatted.year),
      Number(formatted.month) - 1,
      Number(formatted.day),
      Number(formatted.hour),
      Number(formatted.minute),
      Number(formatted.second)
    ) - instant.getTime();
  };
  const initialOffset = offsetAt(new Date(wallClockUtc));
  let result = new Date(wallClockUtc - initialOffset);
  const correctedOffset = offsetAt(result);
  if (correctedOffset !== initialOffset) result = new Date(wallClockUtc - correctedOffset);
  return result;
}

function dateValue(value: unknown, timeZone: string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return dateTimeInZone({
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: value.getUTCDate(),
      hour: value.getUTCHours(),
      minute: value.getUTCMinutes(),
      second: value.getUTCSeconds()
    }, timeZone);
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  const parsed = dateTimeInZone({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second)
  }, timeZone);
  const wallClockCheck = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  if (
    wallClockCheck.getUTCFullYear() !== Number(year) || wallClockCheck.getUTCMonth() !== Number(month) - 1 || wallClockCheck.getUTCDate() !== Number(day) ||
    wallClockCheck.getUTCHours() !== Number(hour) || wallClockCheck.getUTCMinutes() !== Number(minute) || wallClockCheck.getUTCSeconds() !== Number(second)
  ) return null;
  return parsed;
}

function headersInRow(sheet: ExcelJS.Worksheet, rowNumber: number) {
  const headers = new Map<string, number>();
  sheet.getRow(rowNumber).eachCell((cell, columnNumber) => {
    const header = textValue(rawCellValue(cell));
    if (header) headers.set(header, columnNumber);
  });
  return headers;
}

function findHeaderRow(sheet: ExcelJS.Worksheet, requiredHeaders: string[], maxRows = 10) {
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, maxRows); rowNumber += 1) {
    const headers = headersInRow(sheet, rowNumber);
    if (requiredHeaders.every((header) => headers.has(header))) return { rowNumber, headers };
  }
  return null;
}

function arabicItemType(value: string): ItemType | null {
  if (value === "مواد خام") return "RAW_MATERIAL";
  if (value === "مواد تحويلية") return "TRANSFORMATION_MATERIAL";
  if (value === "منتج نهائي") return "FINISHED_PRODUCT";
  return null;
}

function arabicUnit(value: string): Unit | null {
  if (value === "كيلو") return "KG";
  if (value === "جرام") return "GRAM";
  if (value === "لتر") return "LITER";
  if (value === "مللتر") return "MILLILITER";
  if (value === "وحدة") return "PIECE";
  return null;
}

function parseClientProductWorkbook(sheet: ExcelJS.Worksheet, timeZone: string) {
  const header = findHeaderRow(sheet, [
    "اسم المنتج (عربي)",
    "اسم المنتج (English)",
    "نوع المنتج",
    "حالة المنتج",
    "الكود (تلقائي)",
    "وحدة القياس"
  ], 160);
  if (!header) return null;

  const valueAt = (row: ExcelJS.Row, headerName: string) => {
    const column = header.headers.get(headerName);
    return column ? rawCellValue(row.getCell(column)) : undefined;
  };
  const rows: ItemReferenceImportRow[] = [];
  const errors: ItemReferenceImportError[] = [];
  const effectiveAt = dateTimeInZone({
    year: new Date().getUTCFullYear(),
    month: new Date().getUTCMonth() + 1,
    day: new Date().getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0
  }, timeZone);

  for (let rowNumber = header.rowNumber + 1; rowNumber <= Math.min(sheet.rowCount, ITEM_REFERENCE_MAX_ROWS + header.rowNumber + 1); rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const itemNameAr = textValue(valueAt(row, "اسم المنتج (عربي)"));
    const itemCode = textValue(valueAt(row, "الكود (تلقائي)")).toUpperCase();
    if (!itemNameAr && !itemCode) continue;
    if (itemNameAr.startsWith("▼")) continue;
    if (itemCode === "الكود" || itemNameAr === "اسم المنتج (عربي)") continue;

    const itemTypeValue = arabicItemType(textValue(valueAt(row, "نوع المنتج")));
    const baseUnit = arabicUnit(textValue(valueAt(row, "وحدة القياس")));
    const unitWeightKg = numberValue(valueAt(row, "وزن الوحدة (كجم)"));
    const calories = numberValue(valueAt(row, "السعرات الحرارية")) ?? 0;
    const servingGrams = numberValue(valueAt(row, "حجم الحصة (جم)"));
    const rowErrors: ItemReferenceImportError[] = [];
    const add = (column: ItemReferenceImportColumn, message: string) => rowErrors.push({ row: rowNumber, column, message });

    if (!itemCode) add("Item Code", "Item Code is required.");
    if (!itemNameAr) add("Item Name", "Item Name is required.");
    if (!itemTypeValue) add("Item Type", "Item Type must be RAW_MATERIAL, TRANSFORMATION_MATERIAL, or FINISHED_PRODUCT.");
    if (!baseUnit) add("Base Unit", "Base Unit is not allowed.");
    if (unitWeightKg != null && unitWeightKg <= 0) add("Unit Weight (kg)", "Unit Weight (kg) must be greater than 0.");
    if (calories < 0) add("Calories", "Calories must be greater than or equal to 0.");
    if (servingGrams != null && servingGrams <= 0) add("Calorie Reference Quantity", "Calorie Reference Quantity must be greater than 0.");
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    const hasCalorieReference = servingGrams != null && servingGrams > 0;
    const referenceQuantity = hasCalorieReference ? servingGrams : 1;
    const referenceUnit = hasCalorieReference ? "GRAM" : baseUnit!;
    rows.push({
      rowNumber,
      itemCode,
      itemName: textValue(valueAt(row, "اسم المنتج (English)")) || itemNameAr,
      nameAr: itemNameAr,
      itemType: itemTypeValue!,
      categoryName: textValue(valueAt(row, "حالة المنتج")) || textValue(valueAt(row, "نوع المنتج")) || "Uncategorized",
      baseUnit: baseUnit!,
      unitWeightKg: unitWeightKg && unitWeightKg > 0 ? unitWeightKg : null,
      minStockLevel: 0,
      costReferenceQuantity: referenceQuantity,
      costReferenceUnit: referenceUnit,
      costReferenceValue: 0,
      costCurrency: "SAR",
      calorieValue: calories,
      calorieReferenceQuantity: referenceQuantity,
      calorieReferenceUnit: referenceUnit,
      effectiveAt,
      allowCreateCategory: true
    });
  }
  if (rows.length === 0 && errors.length === 0) errors.push({ row: 0, column: "Workbook", message: "The workbook does not contain any data rows." });
  rows.sort((left, right) => left.itemName.localeCompare(right.itemName) || left.effectiveAt.getTime() - right.effectiveAt.getTime());
  return { rows, errors };
}

export async function parseItemReferenceWorkbook(buffer: Buffer, timeZone = "UTC"): Promise<{ rows: ItemReferenceImportRow[]; errors: ItemReferenceImportError[] }> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    return { rows: [], errors: [{ row: 0, column: "Workbook", message: "The file is not a readable Excel workbook." }] };
  }
  const clientSheet = workbook.getWorksheet("إدخال وسجل المنتجات") ?? workbook.worksheets.find((item) => findHeaderRow(item, ["اسم المنتج (عربي)", "الكود (تلقائي)", "وحدة القياس"], 160));
  if (clientSheet) {
    const parsedClient = parseClientProductWorkbook(clientSheet, timeZone);
    if (parsedClient) return parsedClient;
  }

  const sheet = workbook.getWorksheet("Item References") ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], errors: [{ row: 0, column: "Workbook", message: "The workbook does not contain a worksheet." }] };

  const errors: ItemReferenceImportError[] = [];
  const columnIndexes = headersInRow(sheet, 1);
  for (const header of LEGACY_REQUIRED_HEADERS) {
    if (!columnIndexes.has(header)) errors.push({ row: 1, column: "Header", message: `Missing required column: ${header}.` });
  }
  const unexpected = [...columnIndexes.keys()].filter((header) => !ITEM_REFERENCE_HEADERS.includes(header as (typeof ITEM_REFERENCE_HEADERS)[number]));
  unexpected.forEach((header) => errors.push({ row: 1, column: "Header", message: `Unexpected column: ${header}.` }));
  if (errors.length > 0) return { rows: [], errors };

  const rows: ItemReferenceImportRow[] = [];
  const rowLimit = Math.min(sheet.rowCount, ITEM_REFERENCE_MAX_ROWS + 2);
  const valueAt = (row: ExcelJS.Row, header: (typeof ITEM_REFERENCE_HEADERS)[number]) => {
    const column = columnIndexes.get(header);
    return column ? rawCellValue(row.getCell(column)) : undefined;
  };
  for (let rowNumber = 2; rowNumber <= rowLimit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = ITEM_REFERENCE_HEADERS.map((header) => valueAt(row, header));
    if (values.every((value) => textValue(value) === "" && !(value instanceof Date))) continue;

    const itemCode = textValue(valueAt(row, "Item Code")).toUpperCase();
    const itemName = textValue(valueAt(row, "Item Name"));
    const nameAr = textValue(valueAt(row, "Arabic Item Name")) || itemName;
    const itemTypeValue = textValue(valueAt(row, "Item Type")).toUpperCase() || "RAW_MATERIAL";
    const categoryName = textValue(valueAt(row, "Category"));
    const costReferenceUnit = textValue(valueAt(row, "Reference Unit")).toUpperCase();
    const baseUnitValue = textValue(valueAt(row, "Base Unit")).toUpperCase() || costReferenceUnit;
    const unitWeightRaw = valueAt(row, "Unit Weight (kg)");
    const unitWeightKg = textValue(unitWeightRaw) === "" ? null : numberValue(unitWeightRaw);
    const minimumStockRaw = valueAt(row, "Minimum Stock");
    const minStockLevel = textValue(minimumStockRaw) === "" ? 0 : numberValue(minimumStockRaw);
    const costReferenceQuantity = numberValue(valueAt(row, "Reference Quantity"));
    const costReferenceValue = numberValue(valueAt(row, "Cost"));
    const costCurrency = textValue(valueAt(row, "Cost Currency")).toUpperCase();
    const calorieValue = numberValue(valueAt(row, "Calories"));
    const calorieReferenceQuantity = numberValue(valueAt(row, "Calorie Reference Quantity"));
    const calorieReferenceUnit = textValue(valueAt(row, "Calorie Reference Unit")).toUpperCase();
    const effectiveAt = dateValue(valueAt(row, "Effective Date"), timeZone);
    const rowErrors: ItemReferenceImportError[] = [];
    const add = (column: ItemReferenceImportColumn, message: string) => rowErrors.push({ row: rowNumber, column, message });

    if (!itemCode) add(headerByField.itemCode, "Item Code is required.");
    if (!itemName) add(headerByField.itemName, "Item Name is required.");
    if (itemTypeValue !== "RAW_MATERIAL" && itemTypeValue !== "TRANSFORMATION_MATERIAL" && itemTypeValue !== "FINISHED_PRODUCT") {
      add(headerByField.itemType, "Item Type must be RAW_MATERIAL, TRANSFORMATION_MATERIAL, or FINISHED_PRODUCT.");
    }
    if (!ITEM_REFERENCE_UNITS.includes(baseUnitValue as Unit)) add(headerByField.baseUnit, "Base Unit is not allowed.");
    if (unitWeightKg == null && textValue(unitWeightRaw) !== "") add(headerByField.unitWeightKg, "Unit Weight (kg) must be numeric.");
    else if (unitWeightKg != null && unitWeightKg <= 0) add(headerByField.unitWeightKg, "Unit Weight (kg) must be greater than 0.");
    if (minStockLevel == null) add(headerByField.minStockLevel, "Minimum Stock must be numeric.");
    else if (minStockLevel < 0) add(headerByField.minStockLevel, "Minimum Stock must be greater than or equal to 0.");
    if (costReferenceQuantity == null) add(headerByField.costReferenceQuantity, "Reference Quantity must be numeric.");
    else if (costReferenceQuantity <= 0) add(headerByField.costReferenceQuantity, "Reference Quantity must be greater than 0.");
    if (!ITEM_REFERENCE_UNITS.includes(costReferenceUnit as Unit)) add(headerByField.costReferenceUnit, "Reference Unit is not allowed.");
    if (costReferenceValue == null) add(headerByField.costReferenceValue, "Cost must be numeric.");
    else if (costReferenceValue < 0) add(headerByField.costReferenceValue, "Cost must be greater than or equal to 0.");
    if (costCurrency !== "SAR") add(headerByField.costCurrency, "Cost Currency must be SAR.");
    if (calorieValue == null) add(headerByField.calorieValue, "Calories must be numeric.");
    else if (calorieValue < 0) add(headerByField.calorieValue, "Calories must be greater than or equal to 0.");
    if (calorieReferenceQuantity == null) add(headerByField.calorieReferenceQuantity, "Calorie Reference Quantity must be numeric.");
    else if (calorieReferenceQuantity <= 0) add(headerByField.calorieReferenceQuantity, "Calorie Reference Quantity must be greater than 0.");
    if (!ITEM_REFERENCE_UNITS.includes(calorieReferenceUnit as Unit)) add(headerByField.calorieReferenceUnit, "Calorie Reference Unit is not allowed.");
    if (!effectiveAt) add(headerByField.effectiveAt, "Effective Date must use yyyy-mm-dd hh:mm or a valid Excel date.");
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }
    rows.push({
      rowNumber,
      itemCode,
      itemName,
      nameAr,
      itemType: itemTypeValue as ItemType,
      categoryName,
      baseUnit: baseUnitValue as Unit,
      unitWeightKg,
      minStockLevel: minStockLevel!,
      costReferenceQuantity: costReferenceQuantity!,
      costReferenceUnit: costReferenceUnit as Unit,
      costReferenceValue: costReferenceValue!,
      costCurrency: "SAR",
      calorieValue: calorieValue!,
      calorieReferenceQuantity: calorieReferenceQuantity!,
      calorieReferenceUnit: calorieReferenceUnit as Unit,
      effectiveAt: effectiveAt!
    });
  }
  if (sheet.rowCount > ITEM_REFERENCE_MAX_ROWS + 1) {
    errors.push({ row: ITEM_REFERENCE_MAX_ROWS + 2, column: "Workbook", message: `A maximum of ${ITEM_REFERENCE_MAX_ROWS} data rows can be imported.` });
  }
  if (rows.length === 0 && errors.length === 0) errors.push({ row: 0, column: "Workbook", message: "The workbook does not contain any data rows." });
  rows.sort((left, right) => left.itemName.localeCompare(right.itemName) || left.effectiveAt.getTime() - right.effectiveAt.getTime());
  return { rows, errors };
}
