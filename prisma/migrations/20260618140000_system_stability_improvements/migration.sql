ALTER TABLE "users"
ADD COLUMN "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "audit_logs"
ADD COLUMN "quantityDelta" DECIMAL(10,3),
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "notifications"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "audit_logs_isArchived_createdAt_idx"
ON "audit_logs"("isArchived", "createdAt");

CREATE INDEX "notifications_isArchived_createdAt_idx"
ON "notifications"("isArchived", "createdAt");
