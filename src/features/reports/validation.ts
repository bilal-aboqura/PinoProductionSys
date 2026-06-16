import { z } from "zod";

export const reportTypeSchema = z.enum([
  "PRODUCTION_SUMMARY",
  "PRODUCTION_RECIPE",
  "PRODUCTION_CATEGORY",
  "INVENTORY_LEVELS",
  "INVENTORY_MOVEMENTS",
  "INVENTORY_CONSUMPTION",
  "LOW_STOCK",
  "ACTIVE_BATCHES",
  "EXPIRED_BATCHES",
  "NEAR_EXPIRY",
  "DISPOSED_BATCHES",
  "WASTE_SUMMARY",
  "WASTE_ITEM",
  "WASTE_REASON",
  "WAREHOUSE_STOCK",
  "WAREHOUSE_TRANSFERS",
  "STAFF_SUMMARY",
  "STAFF_PRODUCTION",
  "STAFF_ACTIVITY",
  "AUDIT_USER",
  "AUDIT_INVENTORY",
  "AUDIT_BATCH"
]);

export const reportFiltersSchema = z
  .object({
    startDate: z.string().datetime().optional().or(z.literal("")),
    endDate: z.string().datetime().optional().or(z.literal("")),
    warehouseId: z.string().optional(),
    recipeId: z.string().optional(),
    categoryId: z.string().optional(),
    userId: z.string().optional(),
    status: z.string().optional(),
    search: z.string().max(120).optional()
  })
  .transform((filters) => {
    const cleaned = {
      ...filters,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      search: filters.search?.trim() || undefined
    };
    return Object.fromEntries(Object.entries(cleaned).filter(([, value]) => value !== undefined));
  });

export const reportRequestSchema = z.object({
  reportType: reportTypeSchema,
  filters: reportFiltersSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const scheduledReportSchema = z.object({
  name: z.string().trim().min(3).max(100),
  reportType: reportTypeSchema,
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  format: z.enum(["EXCEL", "PDF", "BOTH"]),
  filters: reportFiltersSchema.optional(),
  recipients: z.array(z.string().trim().min(1)).default([])
});

export const exportRequestSchema = z.object({
  format: z.enum(["excel", "pdf"]),
  reportType: reportTypeSchema,
  filters: reportFiltersSchema.optional()
});
