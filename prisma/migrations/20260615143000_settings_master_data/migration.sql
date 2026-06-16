ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SYSTEM_SETTING_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MASTER_DATA_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MASTER_DATA_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MASTER_DATA_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MASTER_DATA_RESTORED';

ALTER TABLE "departments"
  ADD COLUMN IF NOT EXISTS "nameAr" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "nameEn" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "production_lines"
  ADD COLUMN IF NOT EXISTS "nameAr" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "nameEn" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "warehouses"
  ADD COLUMN IF NOT EXISTS "nameAr" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "nameEn" TEXT NOT NULL DEFAULT '';

DROP VIEW IF EXISTS waste_summary_view;

ALTER TABLE "inventory_waste_records"
  ALTER COLUMN "reason" TYPE TEXT USING "reason"::TEXT;

CREATE OR REPLACE VIEW waste_summary_view AS
SELECT
  iwr."reason"::TEXT AS reason,
  COUNT(iwr.id)::INTEGER AS occurrences,
  COALESCE(SUM(iwr."quantity"), 0)::DECIMAL(12,3) AS total_quantity_wasted,
  DATE_TRUNC('day', iwr."timestamp") AS report_date
FROM "inventory_waste_records" iwr
GROUP BY iwr."reason", DATE_TRUNC('day', iwr."timestamp");

CREATE TABLE IF NOT EXISTS "storage_conditions" (
  "id" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "description" TEXT,
  "minTemperature" DECIMAL(5,2),
  "maxTemperature" DECIMAL(5,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storage_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "label_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dimensions" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "label_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "label_templates_name_key" ON "label_templates"("name");

CREATE TABLE IF NOT EXISTS "waste_reason_options" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "waste_reason_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "waste_reason_options_code_key" ON "waste_reason_options"("code");

CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");
