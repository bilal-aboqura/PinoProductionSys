CREATE TABLE IF NOT EXISTS "scheduled_reports" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "filters" JSONB NOT NULL DEFAULT '{}'::JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "report_archives" (
  "id" TEXT NOT NULL,
  "scheduledReportId" TEXT,
  "name" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_archives_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "scheduled_reports_reportType_frequency_isActive_idx" ON "scheduled_reports"("reportType", "frequency", "isActive");
CREATE INDEX IF NOT EXISTS "scheduled_reports_createdById_idx" ON "scheduled_reports"("createdById");
CREATE INDEX IF NOT EXISTS "report_archives_scheduledReportId_generatedAt_idx" ON "report_archives"("scheduledReportId", "generatedAt");

ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_archives" ADD CONSTRAINT "report_archives_scheduledReportId_fkey" FOREIGN KEY ("scheduledReportId") REFERENCES "scheduled_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE VIEW production_summary_view AS
SELECT
  COUNT(po.id)::INTEGER AS total_orders,
  COUNT(CASE WHEN po."status" = 'IN_PROGRESS' THEN 1 END)::INTEGER AS orders_in_progress,
  COUNT(CASE WHEN po."status" = 'COMPLETED' THEN 1 END)::INTEGER AS completed_orders,
  COUNT(CASE WHEN po."status" = 'CANCELLED' THEN 1 END)::INTEGER AS cancelled_orders,
  AVG(EXTRACT(EPOCH FROM (po."completedAt" - po."startedAt"))) AS avg_completion_seconds,
  COALESCE(SUM(po."producedQuantity"), 0)::DECIMAL(12,3) AS total_produced_qty,
  DATE_TRUNC('day', po."createdAt") AS report_date
FROM "production_orders" po
GROUP BY DATE_TRUNC('day', po."createdAt");

CREATE OR REPLACE VIEW inventory_summary_view AS
SELECT
  ii."id" AS item_id,
  ii."code" AS item_code,
  COALESCE(NULLIF(ii."nameEn", ''), ii."nameAr") AS item_name,
  ii."unit"::TEXT AS unit,
  ii."minStockLevel" AS min_qty,
  COALESCE(SUM(ib."currentQuantity"), 0)::DECIMAL(12,3) AS current_qty,
  COALESCE(SUM(ib."availableQuantity"), 0)::DECIMAL(12,3) AS available_qty,
  COUNT(CASE WHEN ib."currentQuantity" < ii."minStockLevel" THEN 1 END)::INTEGER AS low_stock_locations
FROM "inventory_items" ii
LEFT JOIN "inventory_balances" ib ON ii."id" = ib."inventoryItemId"
GROUP BY ii."id", ii."code", ii."nameEn", ii."nameAr", ii."unit", ii."minStockLevel";

CREATE OR REPLACE VIEW batch_summary_view AS
SELECT
  pb."status"::TEXT AS status,
  COUNT(pb.id)::INTEGER AS batch_count,
  COALESCE(SUM(pb."producedQuantity"), 0)::DECIMAL(12,3) AS total_quantity,
  COUNT(CASE WHEN pb."expiryDate" < NOW() AND pb."status" = 'ACTIVE' THEN 1 END)::INTEGER AS expired_active_count,
  COUNT(CASE WHEN pb."expiryDate" >= NOW() AND pb."expiryDate" <= NOW() + INTERVAL '7 days' AND pb."status" = 'ACTIVE' THEN 1 END)::INTEGER AS near_expiry_count
FROM "production_batches" pb
GROUP BY pb."status";

CREATE OR REPLACE VIEW waste_summary_view AS
SELECT
  iwr."reason"::TEXT AS reason,
  COUNT(iwr.id)::INTEGER AS occurrences,
  COALESCE(SUM(iwr."quantity"), 0)::DECIMAL(12,3) AS total_quantity_wasted,
  DATE_TRUNC('day', iwr."timestamp") AS report_date
FROM "inventory_waste_records" iwr
GROUP BY iwr."reason", DATE_TRUNC('day', iwr."timestamp");

CREATE OR REPLACE VIEW staff_performance_view AS
SELECT
  u."id" AS user_id,
  u."displayName" AS staff_name,
  COUNT(CASE WHEN po."status" = 'COMPLETED' THEN 1 END)::INTEGER AS orders_completed,
  COUNT(CASE WHEN po."status" = 'CANCELLED' THEN 1 END)::INTEGER AS orders_cancelled,
  AVG(EXTRACT(EPOCH FROM (po."completedAt" - po."startedAt"))) AS avg_completion_seconds,
  COALESCE(SUM(po."producedQuantity"), 0)::DECIMAL(12,3) AS total_produced_qty,
  COUNT(iwr.id)::INTEGER AS waste_events_count
FROM "users" u
LEFT JOIN "production_orders" po ON po."completedById" = u."id"
LEFT JOIN "inventory_waste_records" iwr ON iwr."userId" = u."id"
GROUP BY u."id", u."displayName";

CREATE INDEX IF NOT EXISTS "idx_production_orders_date_status" ON "production_orders"("createdAt", "status");
CREATE INDEX IF NOT EXISTS "idx_inventory_movements_item_warehouse_date" ON "inventory_movements"("inventoryItemId", "warehouseId", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_production_batches_expiry_status" ON "production_batches"("expiryDate", "status");
CREATE INDEX IF NOT EXISTS "idx_waste_records_item_reason_date" ON "inventory_waste_records"("inventoryItemId", "reason", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_date" ON "audit_logs"("actorId", "createdAt");
