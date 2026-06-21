-- Recipe costing, nutrition reference history, and immutable version snapshots.
ALTER TABLE "recipes"
  ADD COLUMN "servingQuantity" DECIMAL(10,3),
  ADD COLUMN "servingUnit" "Unit",
  ADD COLUMN "servingLabel" TEXT,
  ADD COLUMN "currentSellingPrice" DECIMAL(12,2),
  ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'EGP';

ALTER TABLE "recipe_versions"
  ADD COLUMN "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "totalCalories" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "costPerYieldUnit" DECIMAL(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN "caloriesPerYieldUnit" DECIMAL(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN "servingQuantity" DECIMAL(10,3),
  ADD COLUMN "servingUnit" "Unit",
  ADD COLUMN "servingLabel" TEXT,
  ADD COLUMN "caloriesPerServing" DECIMAL(12,4),
  ADD COLUMN "sellingPriceSnapshot" DECIMAL(12,2),
  ADD COLUMN "profitAmountSnapshot" DECIMAL(12,2),
  ADD COLUMN "profitMarginSnapshot" DECIMAL(7,4),
  ADD COLUMN "calculationCurrency" TEXT NOT NULL DEFAULT 'EGP';

CREATE TABLE "ingredient_reference_profiles" (
  "id" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "costReferenceQuantity" DECIMAL(10,3) NOT NULL,
  "costReferenceUnit" "Unit" NOT NULL,
  "costReferenceValue" DECIMAL(12,2) NOT NULL,
  "calorieReferenceQuantity" DECIMAL(10,3) NOT NULL,
  "calorieReferenceUnit" "Unit" NOT NULL,
  "calorieValue" DECIMAL(12,2) NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "ingredient_reference_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ingredient_reference_profiles_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ingredient_reference_profiles_positive_quantities" CHECK ("costReferenceQuantity" > 0 AND "calorieReferenceQuantity" > 0),
  CONSTRAINT "ingredient_reference_profiles_nonnegative_values" CHECK ("costReferenceValue" >= 0 AND "calorieValue" >= 0)
);

CREATE INDEX "ingredient_reference_profiles_inventoryItemId_effectiveAt_idx" ON "ingredient_reference_profiles"("inventoryItemId", "effectiveAt");
CREATE INDEX "recipe_versions_totalCost_publishedAt_idx" ON "recipe_versions"("totalCost", "publishedAt");
CREATE INDEX "recipe_versions_totalCalories_publishedAt_idx" ON "recipe_versions"("totalCalories", "publishedAt");
CREATE INDEX "recipe_versions_profitMarginSnapshot_publishedAt_idx" ON "recipe_versions"("profitMarginSnapshot", "publishedAt");
