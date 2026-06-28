import QRCode from "qrcode";

function defaultBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

export function buildTraceabilityUrl(
  batchNumber: string,
  locale = "ar",
  baseUrl = defaultBaseUrl(),
  containerNumber?: string
) {
  const path = `/${locale}/inventory/batches/${encodeURIComponent(batchNumber)}`;
  const query = containerNumber ? `?container=${encodeURIComponent(containerNumber)}` : "";
  return baseUrl ? new URL(`${path}${query}`, baseUrl).toString() : `${path}${query}`;
}

export async function generateBatchQrDataUrl(targetUrl: string) {
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
    type: "image/png"
  });
}
