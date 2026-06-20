# Quickstart and Verification Guide: Recipe Costing & Nutrition Analysis

This guide describes the minimum manual and automated checks needed to validate recipe costing, calories, historical snapshots, report outputs, and label data generation.

---

## Prerequisites

- Database migrations are applied for the recipe costing and nutrition schema changes.
- Seed data or manual setup exists for:
  - at least two raw-material inventory items
  - one sellable recipe with category data
  - one printer/template configuration for label generation
- Test users exist with:
  - recipe management permission
  - inventory/master-data configuration permission
  - report access permission
  - printing permission

Suggested local commands:

```bash
npm run typecheck
npm run test
npm run dev
```

---

## Scenario 1: Configure Ingredient Reference Data

1. Sign in as an authorized admin or master-data manager.
2. Navigate to the inventory item or ingredient master workflow.
3. Select a raw material already used by recipes, such as flour.
4. Save a reference profile with:
   - Cost reference quantity: `30`
   - Cost reference unit: `GRAM`
   - Cost reference value: `50`
   - Calorie reference quantity: `100`
   - Calorie reference unit: `GRAM`
   - Calorie value: `364`
5. Validation:
   - The profile saves successfully.
   - A second profile can later be added without overwriting the first one.
   - A zero or negative reference quantity is rejected with a visible validation message.

---

## Scenario 2: Recipe Calculation Preview and Save

1. Sign in as an authorized recipe editor.
2. Open an existing draft recipe or create a new one.
3. Add master-linked ingredient lines and a positive yield quantity.
4. Configure serving size separately from yield, for example:
   - Yield: `100 cookies`
   - Serving: `2 cookies`
5. Validation:
   - The editor shows line-level cost and calorie values.
   - The page displays total cost, total calories, cost per yield unit, calories per yield unit, and calories per serving.
   - `PIECE` ingredients only accept piece-count quantities.
   - Removing the yield or using an incompatible unit blocks per-unit outputs and surfaces a clear error state.

---

## Scenario 3: Historical Snapshot Immutability

1. Publish a recipe after verifying its calculation preview.
2. Record the published totals and version number.
3. Return to the ingredient master and create a newer reference profile with different cost values.
4. Reopen the published recipe version history and inspect the older version.
5. Validation:
   - The old recipe version still shows its original cost, calorie, and profitability values.
   - A fresh calculation preview for the current draft reflects the new ingredient reference values.
   - Historical version detail does not recalculate against the latest ingredient master data.

---

## Scenario 4: Profitability and Missing Price Handling

1. Open a recipe with a current selling price configured.
2. Publish or save the recipe version.
3. Change the recipe selling price afterward.
4. Open the profitability report.
5. Validation:
   - Historical profitability continues using the selling price frozen at save/publish time.
   - Recipes without a current selling price are excluded from profitability ranking.
   - Excluded recipes are visibly identified as incomplete for profitability analysis.

---

## Scenario 5: Label and Production-Sheet Data

1. Open a batch or print flow derived from a recipe version with saved calculations.
2. Generate a label or print job preview.
3. Validation:
   - The payload includes recipe/product name plus any available `servingSize`, `caloriesPerServing`, `caloriesPerUnit`, `totalCalories`, `costPerUnit`, and `totalCost` values.
   - Historical print output uses the saved recipe version values rather than current mutable ingredient references.
   - Missing optional fields are omitted cleanly without breaking the print layout.

---

## Scenario 6: Report and Export Verification

1. Open the recipe costing/nutrition report area.
2. Filter by date range and recipe search term.
3. Open:
   - most expensive recipes
   - lowest calorie recipes
   - recipe cost trend
   - least-profitable recipes
4. Export one filtered view through the existing reports export flow.
5. Validation:
   - Sorting and filtering operate within the project performance targets.
   - The exported file matches the filtered browser dataset.
   - Profitability views reflect frozen historical snapshots, not current mutable values.

---

## Automated Coverage Expectations

Minimum automated coverage after implementation:

- Unit tests for:
  - weight/volume conversion reuse
  - `PIECE` validation
  - cost and calorie formulas
  - serving-size calculations
  - selling-price snapshot logic
- Integration tests for:
  - recipe editor calculation preview
  - version-history immutability
  - report visibility and filtering
  - print payload generation
  - RBAC enforcement for ingredient-reference management and profitability reports
