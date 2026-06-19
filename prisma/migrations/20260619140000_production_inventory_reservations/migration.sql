ALTER TABLE "production_orders" ADD COLUMN "sourceWarehouseId" TEXT;

CREATE INDEX "production_orders_sourceWarehouseId_idx" ON "production_orders"("sourceWarehouseId");

ALTER TABLE "production_orders"
ADD CONSTRAINT "production_orders_sourceWarehouseId_fkey"
FOREIGN KEY ("sourceWarehouseId") REFERENCES "warehouses"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
