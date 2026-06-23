import PDFDocument from "pdfkit";
import path from "node:path";
import type { ReportColumn, ReportFilters, ReportRow, ReportType } from "../types";

const cairoFontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf");

export async function generatePdfReport(input: {
  reportType: ReportType;
  filters: ReportFilters;
  rows: ReportRow[];
  columns: ReportColumn[];
  exportedBy: string;
}) {
  // Supplying the font at construction time prevents PDFKit from loading its
  // built-in Helvetica AFM file, which is not reliably bundled in production.
  const doc = new PDFDocument({ margin: 36, size: "A4", bufferPages: true, font: cairoFontPath });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  renderHeader(doc, input.reportType, input.exportedBy, input.filters);
  renderTable(doc, input.columns, input.rows);
  renderFooters(doc);
  doc.end();

  return done;
}

function renderHeader(doc: PDFKit.PDFDocument, reportType: ReportType, exportedBy: string, filters: ReportFilters) {
  doc.rect(36, 28, 523, 46).fill("#A14323");
  doc.fillColor("#FFFFFF").fontSize(16).text("Pino Production System", 48, 40);
  doc.fontSize(10).text(reportType, 48, 58);
  doc.fillColor("#332820").fontSize(9).text(`Exported by: ${exportedBy}`, 36, 88);
  doc.text(`Exported at: ${new Date().toISOString()}`, 36, 102);
  doc.text(`Filters: ${JSON.stringify(filters)}`, 36, 116, { width: 520 });
  doc.moveDown(2);
}

function renderTable(doc: PDFKit.PDFDocument, columns: ReportColumn[], rows: ReportRow[]) {
  const startX = 36;
  let y = 150;
  const rowHeight = 24;
  const widths = columns.map(() => Math.floor(523 / Math.max(1, columns.length)));

  doc.fontSize(8).fillColor("#FFFFFF");
  columns.forEach((column, index) => {
    const x = startX + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
    doc.rect(x, y, widths[index], rowHeight).fill("#665936");
    doc.fillColor("#FFFFFF").text(column.label, x + 4, y + 8, { width: widths[index] - 8, align: column.align ?? "left" });
  });
  y += rowHeight;

  rows.forEach((row, rowIndex) => {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    columns.forEach((column, index) => {
      const x = startX + widths.slice(0, index).reduce((sum, width) => sum + width, 0);
      doc.rect(x, y, widths[index], rowHeight).fill(rowIndex % 2 === 0 ? "#FFFFFF" : "#F7F3EE");
      doc.fillColor("#332820").text(formatReportValue(column.key, row[column.key]), x + 4, y + 8, {
        width: widths[index] - 8,
        align: column.align ?? "left",
        ellipsis: true
      });
    });
    y += rowHeight;
  });
}

function formatReportValue(key: string, value: ReportRow[string]) {
  if (value == null) return "";
  if (["totalCost", "costPerUnit", "sellingPrice", "profit"].includes(key)) return `${value} SAR`;
  if (["totalCalories", "caloriesPerUnit"].includes(key)) return `${value} kcal`;
  if (key === "margin") return `${value}%`;
  return String(value);
}

function renderFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    doc.fontSize(8).fillColor("#665936").text(`Page ${index + 1} of ${range.count}`, 36, 790, { align: "center", width: 523, lineBreak: false });
  }
}
