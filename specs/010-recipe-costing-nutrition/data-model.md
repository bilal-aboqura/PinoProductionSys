# Database Schema and Data Models: Recipe Costing & Nutrition Analysis

## 1. Schema Strategy

This feature extends the current recipe and inventory schema instead of creating a parallel ingredient subsystem. The key design goals are:

- Keep ingredient identity tied to the existing `InventoryItem` master record.
- Preserve immutable calculation history by freezing totals on `RecipeVersion`.
- Allow future ingredient reference updates without retroactively changing saved recipes, labels, or reports.

---

## 2. Prisma Schema Changes

### Extend `InventoryItem`

`InventoryItem` remains the canonical ingredient master for recipe lines. For this feature it gains relations to ingredient reference history, but commercial selling-price data stays on the recipe header for v1 profitability.

```prisma
model InventoryItem {
  id                         String                      @id @default(cuid())
  code                       String                      @unique
  nameAr                     String
  nameEn                     String
  itemType                   ItemType
  categoryId                 String
  unit                       Unit
  minStockLevel              Decimal                     @default(0.0) @db.Decimal(10, 3)
  isActive                   Boolean                     @default(true)
  createdAt                  DateTime                    @default(now())
  updatedAt                  DateTime                    @updatedAt
  ingredientReferenceProfiles IngredientReferenceProfile[]
  ingredients                RecipeIngredient[]
}
```

Notes:
- `InventoryItem` remains responsible for item identity, unit behavior, and activation state.
- Recipes without selling-price data still support cost and calorie calculations, but are excluded from profitability ranking.

---

### New Model: `IngredientReferenceProfile`

Stores effective-dated cost and calorie reference values for a raw material or ingredient master record.

```prisma
model IngredientReferenceProfile {
  id                       String        @id @default(cuid())
  inventoryItemId          String
  inventoryItem            InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  costReferenceQuantity    Decimal       @db.Decimal(10, 3)
  costReferenceUnit        Unit
  costReferenceValue       Decimal       @db.Decimal(12, 2)
  calorieReferenceQuantity Decimal       @db.Decimal(10, 3)
  calorieReferenceUnit     Unit
  calorieValue             Decimal       @db.Decimal(12, 2)
  effectiveAt              DateTime      @default(now())
  createdById              String
  createdAt                DateTime      @default(now())
  archivedAt               DateTime?

  @@index([inventoryItemId, effectiveAt])
  @@map("ingredient_reference_profiles")
}
```

Validation rules:
- `costReferenceQuantity > 0`
- `calorieReferenceQuantity > 0`
- `costReferenceValue >= 0`
- `calorieValue >= 0`
- `PIECE` profiles must only be used with piece-count recipe quantities

---

### Extend `Recipe`

The recipe header stores operational yield plus structured serving and current commercial values used for future snapshots.

```prisma
model Recipe {
  id                 String        @id @default(cuid())
  nameAr             String
  nameEn             String        @default("")
  code               String        @unique
  status             RecipeStatus  @default(DRAFT)
  yieldQuantity      Decimal       @default(0) @db.Decimal(10, 3)
  yieldUnit          YieldUnit     @default(KG)
  servingQuantity    Decimal?      @db.Decimal(10, 3)
  servingUnit        Unit?
  servingLabel       String?
  currentSellingPrice Decimal?     @db.Decimal(12, 2)
  currencyCode       String        @default("SAR")
  version            Int           @default(0)
  publishedVersion   Int           @default(0)
  ...
}
```

Notes:
- `yieldQuantity` and `yieldUnit` remain the production-facing output definition.
- `servingQuantity`, `servingUnit`, and `servingLabel` are stored separately because nutrition serving size may differ from yield units.
- `currentSellingPrice` is optional and only used for profitability snapshots and reports.

---

### Keep `RecipeIngredient` as the Draft/Edit Line Model

`RecipeIngredient` remains the editable recipe-line table and continues to reference `inventoryItemId`.

```prisma
model RecipeIngredient {
  id              String        @id @default(cuid())
  recipeId        String
  recipe          Recipe        @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])
  quantity        Decimal       @db.Decimal(10, 3)
  unit            String
  purpose         String?
  sortOrder       Int           @default(0)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

Notes:
- Duplicate ingredient lines remain allowed and are included separately in calculations.
- Draft calculation previews can be derived in server actions without persisting transient line totals to this table.

---

### Extend `RecipeVersion` as the Immutable Calculation Snapshot

`RecipeVersion` becomes the canonical persisted snapshot for cost, calories, serving math, and historical profitability.

```prisma
model RecipeVersion {
  id                     String    @id @default(cuid())
  recipeId               String
  recipe                 Recipe    @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  versionNumber          Int
  snapshot               Json
  totalCost              Decimal   @db.Decimal(12, 2)
  totalCalories          Decimal   @db.Decimal(12, 2)
  costPerYieldUnit       Decimal   @db.Decimal(12, 4)
  caloriesPerYieldUnit   Decimal   @db.Decimal(12, 4)
  servingQuantity        Decimal?  @db.Decimal(10, 3)
  servingUnit            Unit?
  servingLabel           String?
  caloriesPerServing     Decimal?  @db.Decimal(12, 4)
  sellingPriceSnapshot   Decimal?  @db.Decimal(12, 2)
  profitAmountSnapshot   Decimal?  @db.Decimal(12, 2)
  profitMarginSnapshot   Decimal?  @db.Decimal(7, 4)
  calculationCurrency    String    @default("SAR")
  publishedById          String
  publishedAt            DateTime  @default(now())

  @@unique([recipeId, versionNumber])
  @@index([recipeId, versionNumber])
  @@index([totalCost, publishedAt])
  @@index([totalCalories, publishedAt])
  @@map("recipe_versions")
}
```

The `snapshot` JSON should be expanded to include:
- ingredient line reference profile IDs
- normalized unit basis used in each calculation
- frozen line cost and line calorie values
- frozen yield and serving inputs
- frozen print-ready calculation values

This keeps detailed audits available without adding a second immutable line-item table.

---

## 3. Snapshot Shapes

### Enriched Recipe Snapshot Payload

`src/lib/recipes/snapshot.ts` should extend the JSON snapshot with a calculation block similar to:

```json
{
  "recipeId": "rec_123",
  "versionNumber": 4,
  "yieldQuantity": "100",
  "yieldUnit": "PIECE",
  "serving": {
    "quantity": "2",
    "unit": "PIECE",
    "label": "cookies"
  },
  "calculations": {
    "currency": "SAR",
    "totalCost": "1000.00",
    "totalCalories": "5000.00",
    "costPerYieldUnit": "10.00",
    "caloriesPerYieldUnit": "50.00",
    "caloriesPerServing": "100.00",
    "sellingPriceSnapshot": "15.00",
    "profitAmountSnapshot": "5.00",
    "profitMarginSnapshot": "33.3333"
  },
  "ingredients": [
    {
      "inventoryItemId": "inv_flour",
      "quantity": "300.000",
      "unit": "GRAM",
      "referenceProfileId": "ref_flour_20260621",
      "lineCost": "500.00",
      "lineCalories": "1100.00"
    }
  ]
}
```

---

## 4. Reporting and Printing Implications

### Reports

Recipe-focused report queries should use queryable `RecipeVersion` columns rather than parsing JSON:
- `totalCost`
- `totalCalories`
- `costPerYieldUnit`
- `caloriesPerYieldUnit`
- `caloriesPerServing`
- `sellingPriceSnapshot`
- `profitAmountSnapshot`
- `profitMarginSnapshot`
- `publishedAt`

### Printing

Print payloads should read from the active recipe version or related batch snapshot and expose:
- `totalCalories`
- `caloriesPerUnit`
- `caloriesPerServing`
- `servingSize`
- `totalCost`
- `costPerUnit`

These values should never be recalculated from the latest ingredient profiles when rendering historical jobs.

---

## 5. Indexing Notes

Recommended indexes:
- `IngredientReferenceProfile(inventoryItemId, effectiveAt desc)`
- `RecipeVersion(recipeId, versionNumber)`
- `RecipeVersion(totalCost, publishedAt)`
- `RecipeVersion(totalCalories, publishedAt)`
- `RecipeVersion(profitMarginSnapshot, publishedAt)`

These support:
- latest-active reference lookup
- fast version retrieval
- highest/lowest cost and calorie ranking
- trend reporting over time

---

## 6. State and Lifecycle Notes

- Ingredient reference profiles are append-only from a business perspective; historical rows remain readable even after new references are created.
- Recipe drafts may preview calculations repeatedly, but only saved/published recipe versions freeze historical outputs.
- Archived recipes remain queryable in version history, reporting, and print-history contexts.
- Profitability values are only present when the recipe had a current selling price at snapshot time.
