DO $$ BEGIN
  CREATE TYPE "ItemType" AS ENUM ('RAW_MATERIAL', 'FINISHED_PRODUCT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Unit" AS ENUM ('KG', 'GRAM', 'LITER', 'MILLILITER', 'PIECE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'WASTE', 'RETURN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdjustmentReason" AS ENUM ('STOCK_COUNT_CORRECTION', 'DAMAGED_GOODS', 'INVENTORY_RECONCILIATION', 'LOST_MATERIALS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WasteReason" AS ENUM ('BURNED_BATCH', 'SPOILAGE', 'PRODUCTION_LOSS', 'DAMAGED_MATERIAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF to_regclass('public.inventory_areas') IS NOT NULL AND to_regclass('public.warehouses') IS NULL THEN
    ALTER TABLE "inventory_areas" RENAME TO "warehouses";
  END IF;
  IF to_regclass('public.user_inventory_areas') IS NOT NULL AND to_regclass('public.user_warehouses') IS NULL THEN
    ALTER TABLE "user_inventory_areas" RENAME TO "user_warehouses";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "warehouses" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
WITH ranked_warehouses AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "name", "id") AS rn,
    COUNT(*) OVER (PARTITION BY "code") AS duplicate_count
  FROM "warehouses"
)
UPDATE "warehouses" w
SET "code" = 'WH-' || LPAD(ranked_warehouses.rn::TEXT, 4, '0')
FROM ranked_warehouses
WHERE w."id" = ranked_warehouses."id"
  AND (w."code" IS NULL OR ranked_warehouses.duplicate_count > 1);
ALTER TABLE "warehouses" ALTER COLUMN "code" SET NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_warehouses' AND column_name = 'inventoryAreaId') THEN
    ALTER TABLE "user_warehouses" RENAME COLUMN "inventoryAreaId" TO "warehouseId";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_warehouses" (
  "userId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "inventory_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "itemType" "ItemType" NOT NULL,
  "categoryId" TEXT NOT NULL,
  "unit" "Unit" NOT NULL,
  "minStockLevel" DECIMAL(10,3) NOT NULL DEFAULT 0.0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_balances" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "currentQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0.0,
  "reservedQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0.0,
  "availableQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0.0,
  "needsReconciliation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_movements" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantityDelta" DECIMAL(10,3) NOT NULL,
  "movementType" "MovementType" NOT NULL,
  "sourceRefId" TEXT,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_transfers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "sourceWhId" TEXT NOT NULL,
  "destWhId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_adjustments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantityDelta" DECIMAL(10,3) NOT NULL,
  "reason" "AdjustmentReason" NOT NULL,
  "notes" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_waste_records" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "reason" "WasteReason" NOT NULL,
  "notes" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_waste_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_consumption_logs" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantityConsumed" DECIMAL(10,3) NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_consumption_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_output_logs" (
  "id" TEXT NOT NULL,
  "productionOrderId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantityProduced" DECIMAL(10,3) NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_output_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventory_audit_logs" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "previousValue" JSONB,
  "newValue" JSONB,
  CONSTRAINT "inventory_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_name_key" ON "warehouses"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "warehouses_code_key" ON "warehouses"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "user_warehouses_userId_warehouseId_key" ON "user_warehouses"("userId", "warehouseId");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_categories_name_key" ON "inventory_categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_code_key" ON "inventory_items"("code");
CREATE INDEX IF NOT EXISTS "inventory_items_code_idx" ON "inventory_items"("code");
CREATE INDEX IF NOT EXISTS "inventory_items_itemType_idx" ON "inventory_items"("itemType");
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_balances_warehouseId_inventoryItemId_key" ON "inventory_balances"("warehouseId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "inventory_balances_warehouseId_inventoryItemId_idx" ON "inventory_balances"("warehouseId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "inventory_movements_timestamp_idx" ON "inventory_movements"("timestamp");
CREATE INDEX IF NOT EXISTS "inventory_movements_warehouseId_inventoryItemId_idx" ON "inventory_movements"("warehouseId", "inventoryItemId");
CREATE INDEX IF NOT EXISTS "inventory_consumption_logs_productionOrderId_idx" ON "inventory_consumption_logs"("productionOrderId");
CREATE INDEX IF NOT EXISTS "inventory_output_logs_productionOrderId_idx" ON "inventory_output_logs"("productionOrderId");

DO $$ DECLARE
  existing_pk TEXT;
BEGIN
  SELECT constraint_name INTO existing_pk
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
    AND table_name = 'user_warehouses'
    AND constraint_type = 'PRIMARY KEY'
  LIMIT 1;
  IF existing_pk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE "user_warehouses" DROP CONSTRAINT %I', existing_pk);
  END IF;
END $$;
ALTER TABLE "user_warehouses" ADD CONSTRAINT "user_warehouses_pkey" PRIMARY KEY ("userId", "warehouseId");

ALTER TABLE "user_warehouses" ADD CONSTRAINT "user_warehouses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_warehouses" ADD CONSTRAINT "user_warehouses_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "inventory_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_sourceWhId_fkey" FOREIGN KEY ("sourceWhId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_destWhId_fkey" FOREIGN KEY ("destWhId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_waste_records" ADD CONSTRAINT "inventory_waste_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_waste_records" ADD CONSTRAINT "inventory_waste_records_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_waste_records" ADD CONSTRAINT "inventory_waste_records_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_consumption_logs" ADD CONSTRAINT "inventory_consumption_logs_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_consumption_logs" ADD CONSTRAINT "inventory_consumption_logs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_consumption_logs" ADD CONSTRAINT "inventory_consumption_logs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_output_logs" ADD CONSTRAINT "inventory_output_logs_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "production_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_output_logs" ADD CONSTRAINT "inventory_output_logs_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_output_logs" ADD CONSTRAINT "inventory_output_logs_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
