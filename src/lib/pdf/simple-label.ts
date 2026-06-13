function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function line(text: string, x: number, y: number, size = 10, font = "F1") {
  return `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`;
}

export function buildProductionLabelPdf(input: {
  orderNumber: string;
  recipeName: string;
  batchReference: string;
  labelReference: string;
  producedQuantity: string;
  yieldUnit: string;
  completedAt: string;
}) {
  const content = [
    "q 1 w 18 18 252 396 re S Q",
    line("Pino Production Label", 32, 388, 16, "F2"),
    line(`Order: ${input.orderNumber}`, 32, 356, 12, "F2"),
    line(`Batch: ${input.batchReference}`, 32, 334, 12, "F2"),
    line(`Label: ${input.labelReference}`, 32, 312, 12, "F2"),
    line("Recipe", 32, 278, 10, "F2"),
    line(input.recipeName.slice(0, 42), 32, 260, 11),
    line("Produced Quantity", 32, 226, 10, "F2"),
    line(`${input.producedQuantity} ${input.yieldUnit}`, 32, 208, 14, "F2"),
    line("Completed At", 32, 174, 10, "F2"),
    line(input.completedAt, 32, 156, 10),
    "q 1 w 32 82 224 44 re S Q",
    line(input.orderNumber, 50, 108, 16, "F2"),
    line("Traceability anchor", 32, 54, 9)
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 432] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold >>"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
