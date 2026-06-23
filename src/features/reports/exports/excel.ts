import ExcelJS from "exceljs";
import type { ReportColumn, ReportFilters, ReportRow, ReportType } from "../types";

const brandPrimary = "A14323";

export async function generateExcelReport(input: {
  reportType: ReportType;
  filters: ReportFilters;
  rows: ReportRow[];
  columns: ReportColumn[];
  exportedBy: string;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Pino Production System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Report", {
    views: [{ state: "frozen", ySplit: 5 }]
  });

  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = `Pino Production - ${input.reportType}`;
  sheet.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${brandPrimary}` } };
  sheet.getCell("A2").value = `Exported by: ${input.exportedBy}`;
  sheet.getCell("A3").value = `Exported at: ${new Date().toISOString()}`;
  sheet.getCell("A4").value = `Filters: ${JSON.stringify(input.filters)}`;

  const headerRow = sheet.getRow(6);
  input.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.label;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF665936" } };
    cell.alignment = { horizontal: column.align ?? "left" };
  });

  input.rows.forEach((row) => {
    sheet.addRow(input.columns.map((column) => row[column.key] ?? ""));
  });

  input.columns.forEach((column, index) => {
    if (["totalCost", "costPerUnit", "sellingPrice", "profit"].includes(column.key)) sheet.getColumn(index + 1).numFmt = '#,##0.00 "SAR"';
    if (["totalCalories", "caloriesPerUnit"].includes(column.key)) sheet.getColumn(index + 1).numFmt = '#,##0.00 "kcal"';
    if (column.key === "margin") sheet.getColumn(index + 1).numFmt = '0.0000"%"';
  });

  sheet.columns.forEach((column) => {
    let width = 14;
    column.eachCell?.((cell) => {
      width = Math.max(width, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(width, 42);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
