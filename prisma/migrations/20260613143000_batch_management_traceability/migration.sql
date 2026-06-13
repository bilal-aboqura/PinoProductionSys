DO $$ BEGIN
  CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED', 'DISPOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LabelTemplate" AS ENUM ('SMALL', 'STANDARD', 'LARGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DisposalReason" AS ENUM ('EXPIRED', 'DAMAGED_GOODS', 'QUALITY_ISSUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "production_batches" (
  "id" TEXT NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "recipeId" TEXT NOT NULL,
  "recipeVersionId" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "productionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "producedQuantity" DECIMAL(10,3) NOT NULL,
  "remainingQuantity" DECIMAL(10,3) NOT NULL,
  "unit" "YieldUnit" NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_containers" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "containerNumber" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "remainingQuantity" DECIMAL(10,3) NOT NULL,
  "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "warehouseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_containers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_qr_codes" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "qrCodeData" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_qr_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_labels" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "containerId" TEXT,
  "labelTemplate" "LabelTemplate" NOT NULL,
  "productName" TEXT NOT NULL,
  "batchNumber" TEXT NOT NULL,
  "productionDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3) NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "storageInstructions" TEXT,
  "productCode" TEXT,
  "warehouseName" TEXT,
  "qrCodeData" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_labels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_status_history" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "fromStatus" "BatchStatus",
  "toStatus" "BatchStatus" NOT NULL,
  "changedById" TEXT NOT NULL,
  "reason" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_print_history" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "containerId" TEXT,
  "printedById" TEXT NOT NULL,
  "printedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "labelTemplate" "LabelTemplate" NOT NULL,
  "isReprint" BOOLEAN NOT NULL DEFAULT false,
  "reprintReason" TEXT,
  CONSTRAINT "batch_print_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_disposals" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "containerId" TEXT,
  "quantityDisposed" DECIMAL(10,3) NOT NULL,
  "disposedById" TEXT NOT NULL,
  "disposedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" "DisposalReason" NOT NULL,
  "notes" TEXT,
  CONSTRAINT "batch_disposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_evidence" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "batch_audit_logs" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousValue" JSONB,
  "newValue" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "batch_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "production_batches_batchNumber_key" ON "production_batches"("batchNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "production_batches_productionOrderId_key" ON "production_batches"("productionOrderId");
CREATE INDEX IF NOT EXISTS "production_batches_status_idx" ON "production_batches"("status");
CREATE INDEX IF NOT EXISTS "production_batches_expiryDate_idx" ON "production_batches"("expiryDate");
CREATE INDEX IF NOT EXISTS "production_batches_warehouseId_idx" ON "production_batches"("warehouseId");
CREATE UNIQUE INDEX IF NOT EXISTS "batch_containers_containerNumber_key" ON "batch_containers"("containerNumber");
CREATE INDEX IF NOT EXISTS "batch_containers_batchId_idx" ON "batch_containers"("batchId");
CREATE INDEX IF NOT EXISTS "batch_containers_warehouseId_idx" ON "batch_containers"("warehouseId");
CREATE UNIQUE INDEX IF NOT EXISTS "batch_qr_codes_batchId_key" ON "batch_qr_codes"("batchId");
CREATE INDEX IF NOT EXISTS "batch_labels_batchId_idx" ON "batch_labels"("batchId");
CREATE INDEX IF NOT EXISTS "batch_labels_containerId_idx" ON "batch_labels"("containerId");
CREATE INDEX IF NOT EXISTS "batch_status_history_batchId_idx" ON "batch_status_history"("batchId");
CREATE INDEX IF NOT EXISTS "batch_print_history_batchId_idx" ON "batch_print_history"("batchId");
CREATE INDEX IF NOT EXISTS "batch_disposals_batchId_idx" ON "batch_disposals"("batchId");
CREATE INDEX IF NOT EXISTS "batch_evidence_batchId_idx" ON "batch_evidence"("batchId");
CREATE INDEX IF NOT EXISTS "batch_audit_logs_batchId_idx" ON "batch_audit_logs"("batchId");

ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches" ADD CONSTRAINT "production_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_containers" ADD CONSTRAINT "batch_containers_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_containers" ADD CONSTRAINT "batch_containers_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_qr_codes" ADD CONSTRAINT "batch_qr_codes_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_labels" ADD CONSTRAINT "batch_labels_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_labels" ADD CONSTRAINT "batch_labels_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "batch_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_status_history" ADD CONSTRAINT "batch_status_history_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_status_history" ADD CONSTRAINT "batch_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_print_history" ADD CONSTRAINT "batch_print_history_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_print_history" ADD CONSTRAINT "batch_print_history_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "batch_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_print_history" ADD CONSTRAINT "batch_print_history_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_disposals" ADD CONSTRAINT "batch_disposals_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_disposals" ADD CONSTRAINT "batch_disposals_containerId_fkey" FOREIGN KEY ("containerId") REFERENCES "batch_containers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_disposals" ADD CONSTRAINT "batch_disposals_disposedById_fkey" FOREIGN KEY ("disposedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_evidence" ADD CONSTRAINT "batch_evidence_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_evidence" ADD CONSTRAINT "batch_evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "batch_audit_logs" ADD CONSTRAINT "batch_audit_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "production_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_audit_logs" ADD CONSTRAINT "batch_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
