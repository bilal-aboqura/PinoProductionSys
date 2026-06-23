import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import type { PrintPayload } from "@/features/printing/types";

const cairoFontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf");
const labelSize = 288;

export async function buildProductionLabelPdf(input: {
  payload: Omit<PrintPayload, "qrCodeImage">;
  orderNumber: string;
  labelReference: string;
  completedAt: string;
}) {
  const doc = new PDFDocument({ margin: 0, size: [labelSize, labelSize], bufferPages: false, font: cairoFontPath });
  const chunks: Buffer[] = [];
  const qrBuffer = await QRCode.toBuffer(input.payload.qrCodeData, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  renderThermalLabel(doc, input, qrBuffer);
  doc.end();
  return done;
}

function renderThermalLabel(doc: PDFKit.PDFDocument, input: {
  payload: Omit<PrintPayload, "qrCodeImage">;
  orderNumber: string;
  labelReference: string;
  completedAt: string;
}, qrBuffer: Buffer) {
  const payload = input.payload;
  doc.rect(10, 10, 268, 268).stroke("#111111");

  doc.fillColor("#000000").fontSize(7).font(cairoFontPath).text(payload.subtitle ?? "BATCH LABEL", 20, 22, { width: 118 });
  doc.fontSize(13).text(payload.title, 20, 34, { width: 122, height: 20, ellipsis: true });

  const rows = [
    ["Batch", payload.batchNumber],
    ["Order", input.orderNumber],
    ["Label", input.labelReference],
    ["Warehouse", payload.warehouseName],
    ["Quantity", payload.quantity && payload.unit ? `${payload.quantity} ${payload.unit}` : payload.quantity],
    ["Produced", formatDate(payload.productionDate)],
    ["Expiry", formatDate(payload.expiryDate)],
    ["Serving", payload.servingSize],
    ["Calories / serving", suffix(payload.caloriesPerServing, "kcal")],
    ["Calories / unit", suffix(payload.caloriesPerUnit, "kcal")],
    ["Total calories", suffix(payload.totalCalories, "kcal")],
    ["Cost / unit", suffix(payload.costPerUnit, "SAR")],
    ["Total cost", suffix(payload.totalCost, "SAR")],
    ["Selling price", suffix(payload.sellingPrice, "SAR")],
    ["Profit", suffix(payload.profit, "SAR")],
    ["Margin", suffix(payload.margin, "%")]
  ].filter((row): row is [string, string] => Boolean(row[1]));

  let y = 61;
  for (const [label, value] of rows) {
    if (y > 242) break;
    doc.fontSize(6.2).fillColor("#000000").text(label, 20, y, { width: 66, height: 9 });
    doc.fontSize(6.8).text(value, 20, y + 8, { width: 118, height: 11, ellipsis: true });
    y += 20;
  }

  doc.image(qrBuffer, 153, 72, { width: 104, height: 104 });
  doc.fontSize(4.5).fillColor("#000000").text(payload.qrCodeData, 105, 262, { width: 162, align: "center", ellipsis: true });

  if (payload.storageInstructions) {
    doc.fontSize(5.2).fillColor("#000000").text(`Storage: ${payload.storageInstructions}`, 153, 184, {
      width: 104,
      height: 34,
      ellipsis: true
    });
  }
  if (input.completedAt) {
    doc.fontSize(5.2).text(`Completed: ${input.completedAt}`, 153, 222, { width: 104, height: 10, ellipsis: true });
  }
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString() : undefined;
}

function suffix(value: string | undefined, unit: string) {
  return value ? `${value} ${unit}` : undefined;
}
