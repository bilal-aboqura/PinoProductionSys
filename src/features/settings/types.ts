import type { AuditAction } from "@prisma/client";

export const masterEntityTypes = [
  "departments",
  "production_lines",
  "warehouses",
  "recipe_categories",
  "categories",
  "storage_conditions",
  "label_templates",
  "waste_reasons"
] as const;

export type MasterEntityType = (typeof masterEntityTypes)[number];

export type SystemSettingKey = "general_preferences" | "qr_config" | "notification_thresholds";

export type GeneralPreferences = {
  companyName: string;
  companyLogoUrl?: string | null;
  timeZone: string;
  dateFormat: string;
  defaultLanguage: "ar" | "en";
};

export type QrConfig = {
  qrEnabled: boolean;
  qrSize: number;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
};

export type NotificationThresholds = {
  lowStockThresholdPercent: number;
  nearExpiryThresholdDays: number;
  productionDelayThresholdMinutes: number;
};

export type SystemSettingValue = GeneralPreferences | QrConfig | NotificationThresholds;

export type MasterEntityDto = {
  id: string;
  entityType: MasterEntityType;
  code?: string | null;
  name?: string | null;
  nameAr?: string | null;
  nameEn?: string | null;
  dimensions?: string | null;
  description?: string | null;
  minTemperature?: string | null;
  maxTemperature?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
};

export type SystemSettingDto = {
  id: string;
  key: SystemSettingKey;
  value: SystemSettingValue;
  description: string | null;
  updatedAt: string;
};

export type SettingsAuditLogDto = {
  id: string;
  actorName: string;
  action: AuditAction;
  targetName: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
};

export type SettingsActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; details?: string[] };
