import QRCode from "qrcode";

export function buildTraceabilityUrl(batchNumber: string, locale = "ar", baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "") {
  const path = `/${locale}/inventory/batches/${encodeURIComponent(batchNumber)}?view=scan`;
  return baseUrl ? new URL(path, baseUrl).toString() : path;
}

export async function generateBatchQrDataUrl(targetUrl: string) {
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
    type: "image/png"
  });
}
