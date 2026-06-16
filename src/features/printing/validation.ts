import { z } from "zod";

export const printerConfigSchema = z.object({
  name: z.string().trim().min(2, "Printer name is required.").max(120),
  description: z.string().trim().max(240).optional().nullable(),
  type: z.enum(["THERMAL", "STANDARD", "PDF_OUTPUT"]),
  isDefault: z.coerce.boolean(),
  isActive: z.coerce.boolean()
});

export const createPrintJobSchema = z.object({
  targetType: z.enum(["BATCH", "CONTAINER", "WAREHOUSE"]),
  targetId: z.string().trim().min(1, "Target is required."),
  templateId: z.string().trim().min(1, "Template is required."),
  printerId: z.string().trim().min(1).optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(100)
});

export const printHistoryFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional()
});

export const reprintSchema = z
  .object({
    printJobId: z.string().trim().min(1, "Print job is required."),
    reason: z.enum(["DAMAGE", "LOSS", "PRINT_ERROR", "OTHER"]),
    customReason: z.string().trim().max(240).optional().nullable()
  })
  .refine((value) => value.reason !== "OTHER" || Boolean(value.customReason?.trim()), {
    message: "Notes are required when the reprint reason is Other.",
    path: ["customReason"]
  });

export const updatePrintJobStatusSchema = z.object({
  jobId: z.string().trim().min(1, "Print job is required."),
  status: z.enum(["COMPLETED", "FAILED"]),
  errorMessage: z.string().trim().max(500).optional().nullable()
});
