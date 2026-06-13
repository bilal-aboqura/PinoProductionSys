CREATE TYPE "ProductionOrderStatus" AS ENUM ('PENDING_UNASSIGNED', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_CLAIMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_STARTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_STEP_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_PHOTO_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_NOTE_ADDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_QUANTITY_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRODUCTION_ORDER_CANCELLED';

CREATE TABLE "production_orders" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "status" "ProductionOrderStatus" NOT NULL DEFAULT 'PENDING_UNASSIGNED',
  "version" INTEGER NOT NULL DEFAULT 0,
  "recipeId" TEXT NOT NULL,
  "recipeVersionId" TEXT NOT NULL,
  "recipeNameSnapshot" TEXT NOT NULL,
  "yieldUnit" TEXT NOT NULL,
  "targetQuantity" DECIMAL(10,3),
  "producedQuantity" DECIMAL(10,3),
  "creationNotes" TEXT,
  "createdById" TEXT NOT NULL,
  "assignedToId" TEXT,
  "claimedById" TEXT,
  "completedById" TEXT,
  "cancelledById" TEXT,
  "cancellationReason" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER,

  CONSTRAINT "production_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_order_steps" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "stepNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "estimatedMinutes" INTEGER,
  "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
  "requiresNotes" BOOLEAN NOT NULL DEFAULT false,
  "requiresQuantity" BOOLEAN NOT NULL DEFAULT false,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedById" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "confirmedQuantity" DECIMAL(10,3),
  "confirmedUnit" TEXT,

  CONSTRAINT "production_order_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_order_step_photos" (
  "id" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
  "uploadedById" TEXT NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "production_order_step_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_order_step_notes" (
  "id" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "addedById" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "production_order_step_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_order_status_history" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "ProductionOrderStatus",
  "toStatus" "ProductionOrderStatus" NOT NULL,
  "changedById" TEXT NOT NULL,
  "reason" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "production_order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_orders_orderNumber_key" ON "production_orders"("orderNumber");
CREATE INDEX "production_orders_status_idx" ON "production_orders"("status");
CREATE INDEX "production_orders_assignedToId_idx" ON "production_orders"("assignedToId");
CREATE INDEX "production_orders_recipeVersionId_idx" ON "production_orders"("recipeVersionId");
CREATE INDEX "production_orders_createdAt_idx" ON "production_orders"("createdAt");

CREATE UNIQUE INDEX "production_order_steps_orderId_stepNumber_key" ON "production_order_steps"("orderId", "stepNumber");
CREATE INDEX "production_order_steps_orderId_stepNumber_idx" ON "production_order_steps"("orderId", "stepNumber");
CREATE INDEX "production_order_step_photos_stepId_idx" ON "production_order_step_photos"("stepId");
CREATE INDEX "production_order_step_notes_stepId_idx" ON "production_order_step_notes"("stepId");
CREATE INDEX "production_order_status_history_orderId_changedAt_idx" ON "production_order_status_history"("orderId", "changedAt");

ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "recipe_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_order_steps" ADD CONSTRAINT "production_order_steps_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_order_step_photos" ADD CONSTRAINT "production_order_step_photos_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "production_order_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_order_step_notes" ADD CONSTRAINT "production_order_step_notes_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "production_order_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_order_status_history" ADD CONSTRAINT "production_order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
