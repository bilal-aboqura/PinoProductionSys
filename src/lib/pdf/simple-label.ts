import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

const cairoFontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf");

export async function buildProductionLabelPdf(input: {
  orderNumber: string;
  recipeName: string;
  batchReference: string;
  labelReference: string;
  producedQuantity: string;
  yieldUnit: string;
  completedAt: string;
  traceUrl: string;
}) {
  const doc = new PDFDocument({ margin: 20, size: [288, 432], bufferPages: false, font: cairoFontPath });
  const chunks: Buffer[] = [];
  const qrBuffer = await QRCode.toBuffer(input.traceUrl, { errorCorrectionLevel: "M", margin: 1, width: 180 });

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.roundedRect(16, 16, 256, 400, 8).stroke("#332820");
  doc.rect(16, 16, 256, 54).fill("#A14323");
  doc.fillColor("#FFFFFF").fontSize(15).text("Pino Production Label", 28, 29, { width: 232, align: "center" });
  doc.fontSize(8).text("Unified traceability label", 28, 50, { width: 232, align: "center" });

  labelRow(doc, "Order", input.orderNumber, 28, 82);
  labelRow(doc, "Batch", input.batchReference, 28, 113);
  labelRow(doc, "Label", input.labelReference, 28, 144);

  doc.fillColor("#665936").fontSize(8).text("Recipe", 28, 177);
  doc.fillColor("#332820").fontSize(12).text(input.recipeName, 28, 190, { width: 232, height: 32, ellipsis: true });

  labelRow(doc, "Produced Quantity", `${input.producedQuantity} ${input.yieldUnit}`, 28, 230);
  labelRow(doc, "Completed At", input.completedAt, 28, 260);

  doc.image(qrBuffer, 92, 295, { width: 104, height: 104 });
  doc.fillColor("#332820").fontSize(8).text("Scan for recipe steps, photos, notes, and traceability", 28, 400, {
    width: 232,
    align: "center"
  });

  doc.end();
  return done;
}

function labelRow(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number) {
  doc.fillColor("#665936").fontSize(8).text(label, x, y, { width: 92 });
  doc.fillColor("#332820").fontSize(11).text(value || "Not recorded", x, y + 13, { width: 232, ellipsis: true });
}
