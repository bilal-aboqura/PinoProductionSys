# API Contracts and Interface Definitions: Recipe Costing & Nutrition Analysis

This feature extends the current Next.js Server Action and report-query patterns already used in the repository. The contracts below focus on the application-facing boundaries that need to be added or expanded.

## 1. Ingredient Reference Profile Management

Managed through server actions attached to the existing inventory/master-data workflow.

```typescript
export async function upsertIngredientReferenceProfile(input: {
  inventoryItemId: string;
  costReferenceQuantity: number;
  costReferenceUnit: "KG" | "GRAM" | "LITER" | "MILLILITER" | "PIECE";
  costReferenceValue: number;
  calorieReferenceQuantity: number;
  calorieReferenceUnit: "KG" | "GRAM" | "LITER" | "MILLILITER" | "PIECE";
  calorieValue: number;
  effectiveAt?: string;
}): Promise<
  | { success: true; profileId: string }
  | { success: false; code: "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL"; error: string; details?: string[] }
>;
```

Rules:
- Requires inventory/system configuration permission.
- Creates a new effective-dated profile instead of mutating historical rows.
- Rejects incompatible or zero reference quantities.

---

## 2. Recipe Calculation Preview

Used by the recipe editor to display ingredient-level and recipe-level totals before saving or publishing.

```typescript
export async function getRecipeCalculationPreview(input: {
  recipeId: string;
}): Promise<
  | {
      success: true;
      data: {
        currency: "EGP";
        totalCost: string;
        totalCalories: string;
        costPerYieldUnit: string | null;
        caloriesPerYieldUnit: string | null;
        caloriesPerServing: string | null;
        missingSellingPrice: boolean;
        lines: Array<{
          recipeIngredientId: string;
          inventoryItemId: string;
          quantity: string;
          unit: string;
          normalizedUnit: string;
          lineCost: string;
          lineCalories: string;
          referenceProfileId: string;
        }>;
      };
    }
  | { success: false; code: "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL"; error: string; details?: string[] }
>;
```

Rules:
- Pulls the latest active ingredient reference profile for each master-linked ingredient line.
- Rejects unit mismatches and non-piece conversions for `PIECE` ingredients.
- Returns `null` per-unit outputs when the recipe yield or serving setup is incomplete.

---

## 3. Publish or Save Recipe with Frozen Calculation Snapshot

The existing recipe save/publish actions should be extended so a persisted `RecipeVersion` includes immutable calculation outputs.

```typescript
export async function publishRecipe(
  recipeId: string,
  version: number
): Promise<
  | {
      success: true;
      data: {
        publishedVersion: number;
        calculationSnapshot: {
          totalCost: string;
          totalCalories: string;
          costPerYieldUnit: string;
          caloriesPerYieldUnit: string;
          caloriesPerServing: string | null;
          sellingPriceSnapshot: string | null;
          profitAmountSnapshot: string | null;
          profitMarginSnapshot: string | null;
        };
      };
    }
  | { success: false; code: "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL"; error: string; details?: string[] }
>;
```

Rules:
- Uses the calculation preview engine at publish/save time.
- Freezes cost, calorie, serving, and selling-price values onto `RecipeVersion`.
- Keeps older versions unchanged even after later ingredient-price or selling-price changes.

---

## 4. Recipe Version Read Contract

The version detail contract should expose frozen calculation data without recalculating from current ingredient master values.

```typescript
export async function getRecipeVersion(
  recipeId: string,
  versionNumber: number
): Promise<
  | {
      success: true;
      data: {
        versionNumber: number;
        publishedAt: string;
        publishedByName: string;
        snapshot: {
          recipeId: string;
          yieldQuantity: string;
          yieldUnit: string;
          serving?: { quantity: string; unit: string; label: string | null };
          calculations: {
            totalCost: string;
            totalCalories: string;
            costPerYieldUnit: string;
            caloriesPerYieldUnit: string;
            caloriesPerServing: string | null;
            sellingPriceSnapshot: string | null;
            profitAmountSnapshot: string | null;
            profitMarginSnapshot: string | null;
          };
          ingredients: Array<{
            inventoryItemId: string;
            quantity: string;
            unit: string;
            referenceProfileId: string;
            lineCost: string;
            lineCalories: string;
          }>;
        };
      };
    }
  | { success: false; code: "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL"; error: string }
>;
```

---

## 5. Reporting Contracts

The reporting query layer should extend `ReportType` and `getReportRows(...)` so recipe costing and nutrition metrics can be filtered and exported through the existing reports UI and export route.

```typescript
export type ReportType =
  | "RECIPE_COST_SUMMARY"
  | "RECIPE_CALORIE_SUMMARY"
  | "RECIPE_PROFITABILITY"
  | "RECIPE_COST_TREND";

export async function getReportRows(
  reportType: ReportType,
  filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    status?: string;
    search?: string;
  },
  page?: number,
  limit?: number
): Promise<{
  rows: Array<Record<string, string | number | boolean | null>>;
  totalCount: number;
  page: number;
  totalPages: number;
  columns: Array<{ key: string; label: string; align?: "left" | "right" | "center" }>;
}>;
```

Rules:
- Profitability rows exclude recipes that do not have a frozen selling price.
- Trend views operate from `RecipeVersion.publishedAt` and frozen snapshot columns, not the current recipe row.

---

## 6. Printing Payload Enrichment

The existing print-job creation flow should automatically include available nutrition and cost values in the `payload` for recipe/batch-related targets.

```typescript
export type PrintPayload = {
  title: string;
  productName?: string;
  batchNumber?: string;
  productionDate?: string;
  expiryDate?: string;
  quantity?: string;
  unit?: string;
  servingSize?: string;
  caloriesPerServing?: string;
  caloriesPerUnit?: string;
  totalCalories?: string;
  costPerUnit?: string;
  totalCost?: string;
  storageInstructions?: string | null;
  qrCodeData: string;
  qrCodeImage: string;
};
```

Rules:
- Historical print jobs must read values from the saved recipe version or print snapshot source, not from current ingredient reference profiles.
- If a related batch or recipe lacks a value such as serving size, the payload omits that field rather than recalculating from current mutable data.
