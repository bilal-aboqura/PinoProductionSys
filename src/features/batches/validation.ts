import { z } from "zod";

export const batchNumberPattern = /^B-\d{4}-\d{5}$/;
export const labelTemplates = ["SMALL", "STANDARD", "LARGE"] as const;
export const batchStatuses = ["ACTIVE", "CONSUMED", "EXPIRED", "DISPOSED"] as const;
export const disposalReasons = ["EXPIRED", "DAMAGED_GOODS", "QUALITY_ISSUE"] as const;
export const evidenceMimeTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const maxEvidenceBytes = 5 * 1024 * 1024;

export const createBatchFromOrderSchema = z.object({
  productionOrderId: z.string().min(1),
  warehouseId: z.string().min(1),
  containerQuantities: z.array(z.coerce.number().positive()).optional()
});

export const printLabelSchema = z
  .object({
    batchId: z.string().min(1),
    containerId: z.string().min(1).optional(),
    template: z.enum(labelTemplates),
    isReprint: z.boolean().default(false),
    reprintReason: z.string().trim().optional()
  })
  .refine((value) => !value.isReprint || (value.reprintReason?.length ?? 0) >= 5, {
    message: "Reprints require a reason of at least 5 characters.",
    path: ["reprintReason"]
  });

export const splitBatchSchema = z.object({
  batchId: z.string().min(1),
  quantities: z.array(z.coerce.number().positive()).min(1)
});

export const updateBatchStatusSchema = z.object({
  batchId: z.string().min(1),
  status: z.enum(batchStatuses),
  reason: z.string().trim().max(500).optional()
});

export const disposeBatchSchema = z.object({
  batchId: z.string().min(1),
  containerId: z.string().min(1).optional(),
  quantity: z.coerce.number().positive(),
  reason: z.enum(disposalReasons),
  notes: z.string().trim().max(2000).optional()
});

export const traceabilitySchema = z.object({
  batchNumber: z.string().regex(batchNumberPattern)
});

export function validateEvidenceFile(input: { type: string; size: number }) {
  if (!evidenceMimeTypes.includes(input.type as (typeof evidenceMimeTypes)[number])) {
    return { valid: false as const, error: "Only JPEG, PNG, WebP, or PDF evidence files are allowed." };
  }
  if (input.size > maxEvidenceBytes) {
    return { valid: false as const, error: "Evidence files must be 5MB or smaller." };
  }
  return { valid: true as const };
}
