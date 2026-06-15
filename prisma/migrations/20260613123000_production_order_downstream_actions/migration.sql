CREATE TYPE "ProductionOrderDownstreamActionType" AS ENUM ('INVENTORY_CONSUMPTION', 'BATCH_RECORD', 'LABEL_PRINT');

CREATE TABLE "production_order_downstream_actions" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actionType" "ProductionOrderDownstreamActionType" NOT NULL,
  "referenceId" TEXT,
  "payload" JSONB,
  "triggeredById" TEXT NOT NULL,
  "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "production_order_downstream_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_order_downstream_actions_orderId_actionType_key" ON "production_order_downstream_actions"("orderId", "actionType");
CREATE INDEX "production_order_downstream_actions_orderId_triggeredAt_idx" ON "production_order_downstream_actions"("orderId", "triggeredAt");

ALTER TABLE "production_order_downstream_actions" ADD CONSTRAINT "production_order_downstream_actions_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "production_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
