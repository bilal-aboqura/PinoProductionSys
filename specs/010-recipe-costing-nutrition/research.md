# Research and Technology Decisions: Recipe Costing & Nutrition Analysis

## 1. Reuse `InventoryItem` as the Ingredient Master

### Decision
Use the existing `InventoryItem` catalog as the canonical ingredient master for this feature, and add ingredient cost/nutrition reference history alongside it instead of introducing a brand-new `Ingredient` table.

### Rationale
- The current recipe module already references `inventoryItemId` on `RecipeIngredient`, so reusing `InventoryItem` preserves existing relationships and avoids a migration from one ingredient identity system to another.
- Inventory already owns unit-of-measure behavior and item activation state, which recipe costing depends on.
- This keeps search, permissions, and master-data management aligned with the current application structure.

### Alternatives Considered
- **Separate `Ingredient` table**: Rejected because it would duplicate master data that already exists in `InventoryItem` and would add synchronization risk between recipe, inventory, and reporting modules.
- **Free-text recipe ingredients with ad hoc pricing/nutrition**: Rejected because the clarified spec requires master-linked ingredients only and historical reporting needs stable identifiers.

---

## 2. Store Effective-Dated Ingredient Reference Profiles

### Decision
Introduce an effective-dated ingredient reference profile model that stores both cost and calorie reference values for an inventory item, including the reference quantity and unit used to normalize calculations.

### Rationale
- Historical costing accuracy depends on knowing exactly which reference values were active at calculation time.
- A single profile record keeps cost and calorie values aligned to the same ingredient reference window and reduces write complexity for admins.
- Effective dating supports future reference changes without mutating past recipe versions.

### Alternatives Considered
- **Overwrite cost/calorie columns directly on `InventoryItem`**: Rejected because it would destroy history and make recipe snapshots harder to audit.
- **Separate cost-history and calorie-history tables**: Rejected for v1 because it adds more coordination complexity without a strong business need to change cost and calories independently.

---

## 3. Freeze Queryable Totals on `RecipeVersion` and Detailed Lines in `snapshot`

### Decision
Persist immutable recipe-level totals as dedicated `RecipeVersion` columns and store the detailed per-line calculation breakdown inside the existing `RecipeVersion.snapshot` JSON payload.

### Rationale
- Recipe-level reports and sorting need indexed, queryable values such as `totalCost`, `totalCalories`, and `profitMarginSnapshot`.
- The existing recipe version model already represents the authoritative historical snapshot for recipe behavior, so it is the simplest place to freeze calculation results.
- Line-level detail remains available for audits and label generation without needing an extra relational snapshot table.

### Alternatives Considered
- **JSON-only snapshots**: Rejected because report queries would become slower and more complex if totals were not queryable columns.
- **Separate calculation snapshot header/line tables**: Rejected for v1 because it duplicates the purpose of `RecipeVersion` and adds avoidable schema complexity.

---

## 4. Reuse Existing Unit Conversion Rules and Treat `PIECE` as Non-Convertible

### Decision
Use the existing inventory unit-conversion approach for weight and volume families, and explicitly treat `PIECE` as a non-convertible unit that can only be calculated against piece-count quantities.

### Rationale
- The repository already contains inventory unit-conversion logic and schema enums for `KG`, `GRAM`, `LITER`, `MILLILITER`, and `PIECE`.
- Reusing that logic reduces risk of inconsistent conversions between inventory consumption and recipe costing.
- The clarification session established that `PIECE` must not auto-convert to weight or volume, which avoids hidden assumptions and audit disputes.

### Alternatives Considered
- **Average-weight conversion for `PIECE` items**: Rejected because the business explicitly chose piece-only handling for this feature.
- **Custom conversion rules per recipe line**: Rejected because it would make recipe calculations harder to validate and would conflict with the simplicity principle.

---

## 5. Store Current Selling Price on the Recipe and Freeze Profitability on Publish

### Decision
Store the current selling price as optional recipe-level commercial data and freeze that value into `RecipeVersion` when calculation snapshots are saved or published.

### Rationale
- The current schema does not expose a dedicated commercial pricing module, but the feature requires profitability ranking in v1.
- Keeping the editable selling price on the recipe header is the smallest change that enables profitability reporting while preserving historical accuracy through version snapshots.
- Recipes without a current selling price can still calculate cost and calories and are cleanly excluded from profitability rankings.

### Alternatives Considered
- **Live profitability from the latest selling price**: Rejected because it violates the clarified requirement for historical profitability accuracy.
- **Introduce a separate pricing subsystem in this phase**: Rejected because it would expand scope beyond the current feature and duplicate future commercial module concerns.

---

## 6. Enrich Existing Print and Report Interfaces Instead of Adding a New Service

### Decision
Expose nutrition/cost outputs by extending the current recipe, printing, and reporting interfaces rather than adding a dedicated calculation API service.

### Rationale
- The application already uses Next.js Server Actions, Prisma-backed query helpers, and route handlers for reports and printing.
- Calculation data belongs close to the recipe-version lifecycle, making it easier to keep snapshots, audit logs, reports, and label payloads consistent.
- This approach aligns with the constitution's simplicity rule and avoids service-boundary overhead for a single application.

### Alternatives Considered
- **Dedicated costing microservice**: Rejected because it adds operational complexity without solving a current scaling problem.
- **Print-only on-demand calculation with no persisted recipe totals**: Rejected because reports, version history, and profitability all require frozen historical values.
