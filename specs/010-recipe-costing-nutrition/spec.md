# Feature Specification: Recipe Costing & Nutrition Analysis

**Feature Branch**: `010-recipe-costing-nutrition`  
**Created**: 2026-06-21  
**Status**: Draft  
**Input**: User description: "Enable the system to automatically calculate recipe cost and nutritional values based on ingredient quantities used in each recipe."

## Clarifications

### Session 2026-06-21

- Q: How should `Piece`-based ingredients be handled in recipe calculations? → A: `Piece` ingredients can only be used in recipes by piece count.
- Q: Should serving size be the same as recipe yield, or stored separately? → A: Serving size is stored separately from recipe yield and can differ from it.
- Q: Must recipe ingredient lines reference ingredient master records, or can they be free-text? → A: Every recipe ingredient line must reference an existing ingredient master record.
- Q: How should serving size be stored for nutrition labeling? → A: Store serving size as a structured quantity plus serving label.
- Q: Which selling price should historical profitability use? → A: Profitability reports use the selling price active at the time the recipe calculation or related record was saved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calculate Recipe Cost and Calories Automatically (Priority: P1)

An authorized user creates a new recipe or updates an existing one and wants the system to immediately calculate the total recipe cost, total recipe calories, cost per yielded unit, and calories per yielded unit based on the ingredient quantities entered from the ingredient master records linked to the recipe.

**Why this priority**: Automatic recipe costing and calorie calculation is the core business outcome. Without this story, users still need manual spreadsheets and hand calculations.

**Independent Test**: Can be fully tested by opening a recipe with configured ingredient master records and reference values, entering ingredient quantities and a final yield, and confirming the system produces the expected line-level and recipe-level totals without external calculation.

**Acceptance Scenarios**:

1. **Given** a recipe contains ingredients with valid cost and calorie reference values, **When** an authorized user enters the quantity used for each ingredient, **Then** the system calculates and displays the cost and calories for each ingredient line.
2. **Given** a recipe contains one or more calculated ingredient lines, **When** the recipe is saved or reviewed, **Then** the system displays the total recipe cost and total recipe calories as the sum of all ingredient lines.
3. **Given** a recipe has a valid final yield quantity, **When** the recipe totals are calculated, **Then** the system also calculates and displays cost per yielded unit and calories per yielded unit.
4. **Given** an authorized user changes an ingredient quantity or the recipe yield, **When** the change is applied, **Then** the calculation results refresh to reflect the new totals before the user prints or publishes the recipe.

---

### User Story 2 - Maintain Ingredient Cost and Calorie References (Priority: P2)

An administrator maintains a master list of ingredients and records the unit type, cost reference, and calorie reference for each ingredient so that recipes can be calculated consistently across the system.

**Why this priority**: Recipe calculations are only trustworthy when ingredient reference data is standardized and reusable.

**Independent Test**: Can be tested by creating a new ingredient, entering a supported unit type plus valid cost and calorie references, saving it, and verifying that the system derives the per-unit values used later in recipe calculations.

**Acceptance Scenarios**:

1. **Given** an administrator creates a new ingredient, **When** they enter the ingredient name, supported unit type, cost value, cost reference quantity, calorie value, and calorie reference quantity, **Then** the system saves the ingredient and derives normalized per-unit cost and calorie values automatically.
2. **Given** an ingredient uses a weight or volume unit, **When** the administrator stores its reference values in kilograms or liters, **Then** the system converts those values correctly for recipe lines entered in grams or milliliters.
3. **Given** an ingredient uses the `Piece` unit type, **When** the administrator saves and later uses that ingredient in a recipe, **Then** the ingredient is calculated only by piece count and is not converted to or from weight or volume units.
4. **Given** an administrator edits the cost or calorie reference for an ingredient, **When** the change is saved, **Then** the new reference values become available for future recipe calculations without overwriting historical recipe results.

---

### User Story 3 - Preserve Historical Calculation Accuracy (Priority: P2)

An authorized user updates a recipe or an ingredient reference value and needs previous recipe versions, historical production records, and past label data to remain unchanged so that audits, traceability, and profitability reviews stay accurate over time.

**Why this priority**: Historical accuracy is essential for traceability, operational trust, and explaining past margins or nutrition values after ingredient prices change.

**Independent Test**: Can be tested by calculating a recipe, saving it, changing an ingredient cost later, and verifying that the old recipe version still shows its original cost and calorie values while a new calculation uses the updated reference values.

**Acceptance Scenarios**:

1. **Given** a recipe has been calculated and versioned, **When** an ingredient's cost reference changes later, **Then** the previously saved recipe version continues to display the original calculation results.
2. **Given** a recipe is edited after its prior version was saved, **When** the user saves the updated recipe, **Then** the system records a new version with the new calculation results while preserving the prior version for comparison.
3. **Given** a historical production or label record references an earlier recipe calculation, **When** a user reviews that historical record, **Then** the record shows the frozen cost and calorie values that were active at the time it was generated.
4. **Given** a historical profitability view is opened, **When** the related selling price has changed since the recipe version was saved, **Then** the profitability result continues to use the selling price that was active when that calculation or related record was saved.

---

### User Story 4 - Use Cost and Nutrition Data in Labels and Reports (Priority: P3)

An authorized user wants recipe cost and calorie information to be available for product labels, production sheets, and management reports so that the business can standardize customer-facing information and evaluate recipe performance.

**Why this priority**: Labels and reporting extend the value of the calculations into day-to-day operations, but they depend on the core calculation engine already being available.

**Independent Test**: Can be tested by opening a calculated recipe or related production batch, generating printable label data, and viewing reporting lists that rank recipes by cost and calorie metrics.

**Acceptance Scenarios**:

1. **Given** a recipe has valid calculation results, **When** a user generates printable output, **Then** the system provides total calories, calories per unit, total cost, and cost per unit as available print fields.
2. **Given** a production or labeling workflow includes serving and batch information, **When** a user prepares a product label, **Then** the system can include product name, calories per serving, serving size, batch number, production date, and expiry date alongside the calculated values, even when serving size differs from the recipe yield unit.
3. **Given** a recipe stores a serving size, **When** a user views or prints nutrition information, **Then** the serving size is shown as a structured quantity plus serving label such as `2 cookies` or `250 ml`.
4. **Given** multiple recipes have saved calculation results, **When** an authorized manager opens the reporting view, **Then** the system can rank recipes by highest cost, lowest cost, highest calories, lowest calories, and show cost trends over time.

### Edge Cases

- What happens when a recipe ingredient quantity is entered in a unit that is incompatible with the ingredient's reference unit family? The system must block calculation for that line and clearly identify the unit mismatch.
- What happens when a `Piece`-based ingredient is entered using grams, kilograms, milliliters, or liters? The system must reject the entry because `Piece` ingredients are calculated only by piece count.
- What happens when an ingredient cost or calorie reference quantity is zero? The system must reject the reference entry and explain that reference quantities must be greater than zero.
- What happens when a recipe yield quantity is zero or negative? The system must block the save or calculation and require a valid positive yield quantity before per-unit outputs are generated.
- What happens when the same ingredient appears more than once in the same recipe? The system must calculate each line separately and include all lines in the recipe totals while preserving the user's entered lines.
- What happens when an ingredient becomes inactive after it was used in historical recipes? Historical recipes, reports, and labels must remain viewable with their original ingredient names and frozen calculation results.
- What happens when a user tries to add a recipe ingredient that does not exist in the ingredient master list? The system must reject the entry and require selection or creation of a valid ingredient master record.
- What happens when a recipe is linked to reporting that requires profitability data but no selling price is available for the finished product? The recipe must be excluded from profitability ranking and flagged as missing selling price information.
- What happens when a recipe's selling price changes after historical profitability records already exist? Historical profitability records must continue using the selling price that was active when the calculation or record was saved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authorized users to create and edit ingredient records that include ingredient name, supported unit type, cost reference value, cost reference quantity, calorie reference value, and calorie reference quantity.
- **FR-002**: The system MUST support the following ingredient unit types for this feature: Gram, Kilogram, Milliliter, Liter, and Piece.
- **FR-003**: The system MUST automatically derive a normalized cost-per-unit value from each ingredient's stored cost reference value and cost reference quantity.
- **FR-004**: The system MUST automatically derive a normalized calories-per-unit value from each ingredient's stored calorie reference value and calorie reference quantity.
- **FR-005**: The system MUST automatically convert quantities between compatible weight units (Gram/Kilogram) and compatible volume units (Milliliter/Liter) when calculating recipe lines.
- **FR-006**: The system MUST reject recipe calculations when the recipe quantity unit and the ingredient reference unit are incompatible and cannot be converted.
- **FR-006a**: The system MUST treat `Piece` as a non-convertible unit type; ingredients defined in `Piece` MUST only be calculated with piece-count quantities.
- **FR-007**: The system MUST allow authorized users to create and edit recipes with ingredient quantities and a final yield quantity used to calculate per-unit outputs.
- **FR-007a**: The system MUST require every recipe ingredient line to reference an existing ingredient master record; free-text ingredient lines are not permitted in this feature.
- **FR-008**: The system MUST store a user-defined yield description for each recipe so that per-unit outputs can be understood in business terms such as cookies, bottles, cakes, or labels.
- **FR-008a**: The system MUST allow a recipe to store serving size separately from recipe yield so that nutrition labels can describe consumer servings that differ from the production yield unit.
- **FR-008b**: The system MUST store serving size as a structured quantity plus serving label so that calories per serving can be calculated consistently and displayed in a business-readable format.
- **FR-009**: The system MUST calculate each recipe ingredient line cost as the quantity used multiplied by the ingredient's normalized cost-per-unit value.
- **FR-010**: The system MUST calculate each recipe ingredient line calories as the quantity used multiplied by the ingredient's normalized calories-per-unit value.
- **FR-011**: The system MUST calculate total recipe cost as the sum of all recipe ingredient line costs.
- **FR-012**: The system MUST calculate total recipe calories as the sum of all recipe ingredient line calories.
- **FR-013**: The system MUST calculate cost per yielded unit as total recipe cost divided by the recipe's final yield quantity.
- **FR-014**: The system MUST calculate calories per yielded unit as total recipe calories divided by the recipe's final yield quantity.
- **FR-015**: The system MUST refresh recipe calculation results whenever ingredient quantities, ingredient reference values, or recipe yield values change.
- **FR-016**: The system MUST display a calculation breakdown showing ingredient-level cost and calorie values alongside recipe totals before users print, publish, or otherwise finalize the recipe.
- **FR-017**: The system MUST make the following calculated values available as printable fields for labels and production sheets: Total Calories, Calories Per Unit, Total Cost, and Cost Per Unit.
- **FR-018**: The system MUST make product name, calories per serving, serving size, batch number, production date, and expiry date available to label workflows whenever those values exist in the related recipe or production record.
- **FR-018a**: The system MUST calculate calories per serving from the stored serving size definition rather than assuming the serving size always matches the recipe yield unit.
- **FR-019**: The system MUST allow authorized users to duplicate a recipe, carrying forward its ingredient lines, yield settings, and most recent calculation inputs into a new editable recipe record.
- **FR-020**: The system MUST allow authorized users to archive a recipe without deleting its historical calculation results.
- **FR-021**: The system MUST create a new recipe version whenever a saved change affects recipe ingredients, recipe yield, or calculation inputs, and MUST record the previous version, new version, change date, and acting user.
- **FR-022**: The system MUST freeze the calculated cost and calorie outputs for each saved recipe version so that later ingredient reference changes do not alter historical results.
- **FR-023**: The system MUST preserve historical calculation snapshots for production sheets, printed labels, and other historical records that were generated from an earlier recipe version.
- **FR-024**: The system MUST retain historical ingredient cost and calorie references in a way that identifies which values were active when a recipe calculation was saved.
- **FR-025**: The system MUST provide reporting views for most expensive recipes, least expensive recipes, highest calorie recipes, lowest calorie recipes, and recipe cost trends over time.
- **FR-026**: The system MUST provide a least-profitable recipes report for recipes that are linked to an active selling price and MUST exclude recipes without a selling price from that ranking while identifying them as incomplete for profitability analysis.
- **FR-026a**: The system MUST freeze the selling price used for profitability calculations at the time the recipe calculation or related historical record is saved so that later selling price changes do not alter historical profitability results.
- **FR-027**: The system MUST validate that recipe ingredient quantities are greater than zero before allowing calculations or save completion.
- **FR-028**: The system MUST validate that ingredient cost values are zero or greater and that cost reference quantities are greater than zero.
- **FR-029**: The system MUST validate that ingredient calorie values are zero or greater and that calorie reference quantities are greater than zero.
- **FR-030**: The system MUST validate that recipe yield quantities are greater than zero before calculating or displaying per-unit outputs.
- **FR-031**: The system MUST retain duplicate ingredient lines as entered by the user and include every line in recipe totals.
- **FR-032**: The system MUST enforce access to ingredient management, recipe management, duplication, archiving, reporting, and print-related actions through the platform's existing permission model.

### Key Entities *(include if feature involves data)*

- **Ingredient**: A reusable raw material or component used in recipes. Key attributes include name, supported unit type, active status, and the current cost and calorie references used for future calculations. Every recipe ingredient line must reference one ingredient master record.
- **Ingredient Reference Value**: A time-bound record describing the monetary value and calorie value of an ingredient against a defined reference quantity, used to derive normalized per-unit calculations while preserving history.
- **Recipe Yield Profile**: The output definition for a recipe, including final yield quantity and the business label describing that yield such as cookies, bottles, cakes, or labels.
- **Serving Profile**: A recipe-level definition of the consumer-facing serving size used for nutrition labeling, stored independently from the recipe yield profile and expressed as a structured quantity plus serving label.
- **Recipe Calculation Snapshot**: An immutable record of a recipe version's calculated ingredient line costs, ingredient line calories, total cost, total calories, cost per unit, and calories per unit at a specific point in time.
- **Printable Nutrition and Cost Record**: A historical record of the calculation values and label-ready fields made available for production sheets or labels when a recipe or production record is printed or generated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of authorized users can configure a new ingredient's unit, cost reference, and calorie reference in under 2 minutes without external help.
- **SC-002**: Users see updated recipe total cost, total calories, cost per unit, and calories per unit within 2 seconds of changing an ingredient quantity or recipe yield.
- **SC-003**: 100% of saved recipe versions retain their original calculation results after later ingredient cost or calorie references are updated.
- **SC-004**: 95% of published recipes can generate label-ready and production-sheet-ready cost and calorie data in under 3 seconds.
- **SC-005**: Authorized managers can open ranked recipe cost and calorie reports and identify the top or bottom 20 recipes in under 5 seconds.
- **SC-006**: At least 90% of recipe costing and calorie calculations used in daily operations are completed inside the system without requiring a separate spreadsheet or manual calculator.

## Assumptions

- This feature extends the existing recipe workflow and version history already used by the platform rather than replacing recipe management itself.
- Recipe ingredients are selected from a maintained ingredient master list rather than entered as free text.
- Nutrition analysis in this version is limited to calorie calculations; broader nutrient breakdowns such as protein, fat, carbohydrate, sodium, or allergen analysis are out of scope.
- Currency values are stored and displayed in Egyptian Pounds (EGP) unless the business later introduces multi-currency support.
- Existing production and label workflows provide batch number, production date, expiry date, and related operational fields when printed outputs are generated from those contexts.
- The printing workflow is responsible for rendering and sending labels or production sheets to printers; this feature is responsible for supplying the calculation data used by those outputs.
- Profitability reporting depends on recipes being linked to a finished product or selling price record elsewhere in the business workflow; recipes without a current selling price remain calculable for cost and calories but are excluded from profitability rankings.
- Selling price history is available from the related product or pricing workflow so that historical profitability snapshots can preserve the active selling price used at save time.
- Decimal quantities are permitted where the business needs partial weights, volumes, or pieces.
- Serving size is a business-defined nutrition concept and may differ from the operational yield unit used for production costing.
