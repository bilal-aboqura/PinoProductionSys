import { z } from "zod";
import type { MasterEntityType, SystemSettingKey } from "./types";

const nameSchema = z.string().trim().min(2).max(100);
const optionalText = z.string().trim().max(500).optional().nullable();
const codeSchema = z.string().trim().min(1).max(40).regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, underscores, or dashes only.");

export const localizedMasterSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  nameAr: nameSchema,
  nameEn: nameSchema,
  description: optionalText,
  isActive: z.coerce.boolean().optional()
});

export const warehouseMasterSchema = localizedMasterSchema.extend({
  code: codeSchema.max(16),
  name: z.string().trim().min(2).max(100).optional()
});

export const storageConditionSchema = localizedMasterSchema.extend({
  minTemperature: z.coerce.number().min(-100).max(100).optional().nullable(),
  maxTemperature: z.coerce.number().min(-100).max(100).optional().nullable()
}).refine(
  (value) => value.minTemperature == null || value.maxTemperature == null || value.minTemperature <= value.maxTemperature,
  { path: ["maxTemperature"], message: "Maximum temperature must be greater than minimum temperature." }
);

export const labelTemplateSchema = z.object({
  name: nameSchema,
  dimensions: z.string().trim().min(3).max(40),
  isActive: z.coerce.boolean().optional()
});

export const wasteReasonSchema = localizedMasterSchema.extend({
  code: codeSchema.max(40)
});

export const generalPreferencesSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  companyLogoUrl: z.string().trim().max(300).optional().nullable(),
  timeZone: z.string().trim().min(3).max(80),
  dateFormat: z.enum(["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"]),
  defaultLanguage: z.enum(["ar", "en"]),
  currencyCode: z.literal("SAR")
});

export const qrConfigSchema = z.object({
  qrEnabled: z.coerce.boolean(),
  qrSize: z.coerce.number().int().min(64).max(512),
  errorCorrectionLevel: z.enum(["L", "M", "Q", "H"])
});

export const notificationThresholdsSchema = z.object({
  lowStockThresholdPercent: z.coerce.number().min(0).max(100),
  nearExpiryThresholdDays: z.coerce.number().int().min(1).max(365),
  productionDelayThresholdMinutes: z.coerce.number().int().min(1).max(1440)
});

export function schemaForSystemSetting(key: SystemSettingKey) {
  if (key === "general_preferences") return generalPreferencesSchema;
  if (key === "qr_config") return qrConfigSchema;
  return notificationThresholdsSchema;
}

export function schemaForMasterEntity(entityType: MasterEntityType) {
  if (entityType === "warehouses") return warehouseMasterSchema;
  if (entityType === "storage_conditions") return storageConditionSchema;
  if (entityType === "label_templates") return labelTemplateSchema;
  if (entityType === "waste_reasons") return wasteReasonSchema;
  return localizedMasterSchema;
}
