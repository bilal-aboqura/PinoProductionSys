import { batchNumberPattern } from "./validation";

const containerNumberPattern = /^(B-[A-Z0-9]+(?:-[A-Z0-9]+)+)-C(\d+)$/i;

export type BatchScanTarget = {
  batchNumber: string;
  containerNumber?: string;
};

export function parseBatchScanTarget(value: string): BatchScanTarget | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const containerMatch = normalized.match(containerNumberPattern);
  if (containerMatch) {
    return {
      batchNumber: containerMatch[1],
      containerNumber: normalized
    };
  }

  if (batchNumberPattern.test(normalized)) {
    return { batchNumber: normalized };
  }

  return null;
}

export function buildBatchScanPath(locale: string, target: BatchScanTarget) {
  const query = new URLSearchParams({ view: "scan" });
  if (target.containerNumber) query.set("container", target.containerNumber);
  return `/${locale}/inventory/batches/${encodeURIComponent(target.batchNumber)}?${query.toString()}`;
}
