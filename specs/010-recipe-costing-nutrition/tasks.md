# Tasks: Recipe Costing & Nutrition Analysis

**Input**: Design documents from `/specs/010-recipe-costing-nutrition/`  
**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: Tests are required by the PinoProductionSys Constitution (Standard VIII) and by the feature quickstart scenarios for business logic, integration workflows, validation boundaries, and permission enforcement.

**Organization**: Tasks are grouped by setup, foundation, user story, and polish phases so each story remains independently implementable and testable.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths are included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the feature scaffolding and test entry points used across all stories.

- [ ] T001 Create shared recipe costing helper scaffolds in `src/lib/recipes/calculations.ts` and `src/lib/recipes/reference-profiles.ts`
- [ ] T002 [P] Create the recipe costing report page scaffold in `src/app/[locale]/(protected)/reports/recipes/page.tsx`
- [ ] T003 [P] Create recipe costing test entry points in `src/lib/recipes/calculations.test.ts` and `tests/integration/recipe-costing.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, shared contracts, permissions, and reference lookup infrastructure that must exist before any story can be delivered.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Update recipe costing schema fields and the new `IngredientReferenceProfile` model in `prisma/schema.prisma`
- [ ] T005 Generate and review the Prisma migration for recipe costing schema changes in `prisma/migrations/`
- [ ] T006 [P] Extend recipe snapshot and DTO contracts for costing, serving, and profitability fields in `src/lib/recipes/snapshot.ts` and `src/features/recipes/types.ts`
- [ ] T007 [P] Add permission constants and guard helpers for ingredient reference management and recipe-costing reports in `src/lib/permissions.ts`
- [ ] T008 Implement active reference profile resolution and normalized unit lookup helpers in `src/lib/recipes/reference-profiles.ts`
- [ ] T009 [P] Extend inventory queries and DTOs to load current and historical ingredient reference profiles in `src/features/inventory/queries.ts` and `src/features/inventory/types.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Calculate Recipe Cost and Calories Automatically (Priority: P1) MVP

**Goal**: Let authorized users see line-level and recipe-level cost/calorie outputs update automatically while editing recipes.

**Independent Test**: Open a recipe with configured ingredient master records, edit ingredient quantities and yield data, and confirm the UI shows correct line totals, total cost, total calories, cost per yield unit, and calories per yield unit without external calculation.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add unit tests for cost, calorie, yield, serving, and unit-conversion formulas in `src/lib/recipes/calculations.test.ts`
- [ ] T011 [P] [US1] Add integration coverage for recipe calculation preview and validation boundaries in `tests/integration/recipe-costing.spec.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement the core recipe calculation engine in `src/lib/recipes/calculations.ts`
- [ ] T013 [US1] Extend recipe server actions with calculation preview, save-time recalculation, and duplication defaults in `src/features/recipes/actions.ts`
- [ ] T014 [P] [US1] Extend recipe DTOs with line totals and calculated summary fields in `src/features/recipes/types.ts`
- [ ] T015 [US1] Update ingredient line editing to display normalized line cost and calorie outputs in `src/components/recipes/IngredientEditor.tsx`
- [ ] T016 [US1] Update the main recipe form to capture yield and serving inputs and render calculation summaries in `src/components/recipes/RecipeForm.tsx`
- [ ] T017 [US1] Surface calculation summaries on recipe create and detail pages in `src/app/[locale]/(protected)/recipes/new/page.tsx` and `src/app/[locale]/(protected)/recipes/[id]/page.tsx`

**Checkpoint**: User Story 1 should now be fully functional and independently testable.

---

## Phase 4: User Story 2 - Maintain Ingredient Cost and Calorie References (Priority: P2)

**Goal**: Let administrators manage effective-dated cost and calorie reference profiles for ingredient master records.

**Independent Test**: Open an inventory item, create a cost/calorie reference profile with valid units and values, save it, and confirm the normalized values and profile history are available for recipe calculations.

### Tests for User Story 2

- [ ] T018 [P] [US2] Add unit tests for ingredient reference profile validation and effective-date selection in `src/features/inventory/__tests__/reference-profiles.test.ts`
- [ ] T019 [P] [US2] Add integration coverage for ingredient cost and calorie reference management in `tests/integration/ingredient-reference-profiles.spec.ts`

### Implementation for User Story 2

- [ ] T020 [US2] Implement ingredient reference profile validation and write actions in `src/features/inventory/validation.ts` and `src/features/inventory/actions.ts`
- [ ] T021 [P] [US2] Extend inventory item DTOs and query responses with current and historical reference profile data in `src/features/inventory/types.ts` and `src/features/inventory/queries.ts`
- [ ] T022 [US2] Add cost, calorie, unit, and effective-date inputs to the inventory item form in `src/app/[locale]/(protected)/inventory/items/_components/ItemForm.tsx`
- [ ] T023 [US2] Display normalized reference values and profile history on the inventory items page in `src/app/[locale]/(protected)/inventory/items/page.tsx`

**Checkpoint**: User Story 2 should now be independently functional and provide the reference data needed by recipe calculations.

---

## Phase 5: User Story 3 - Preserve Historical Calculation Accuracy (Priority: P2)

**Goal**: Freeze calculation and selling-price values on recipe versions so later master-data changes never alter historical outputs.

**Independent Test**: Publish or save a recipe version, change an ingredient reference value or current selling price later, and confirm the historical version detail still shows the original cost, calorie, and profitability values.

### Tests for User Story 3

- [ ] T024 [P] [US3] Add unit tests for snapshot freezing and historical selling-price logic in `src/lib/recipes/snapshot.test.ts`
- [ ] T025 [P] [US3] Add integration coverage for recipe version immutability and profitability history in `tests/integration/recipe-version-history.spec.ts`

### Implementation for User Story 3

- [ ] T026 [US3] Persist frozen calculation, serving, archive-safe, and selling-price snapshot values during recipe save and publish flows in `src/features/recipes/actions.ts`
- [ ] T027 [US3] Expand recipe snapshot generation with line-level reference profile metadata and profitability fields in `src/lib/recipes/snapshot.ts`
- [ ] T028 [P] [US3] Extend version history table rows with frozen cost, calorie, and profitability metadata in `src/components/recipes/VersionHistoryTable.tsx`
- [ ] T029 [US3] Render frozen calculation data in recipe version pages `src/app/[locale]/(protected)/recipes/[id]/versions/page.tsx` and `src/app/[locale]/(protected)/recipes/[id]/versions/[v]/page.tsx`

**Checkpoint**: User Story 3 should now be independently functional and protect all historical recipe outputs.

---

## Phase 6: User Story 4 - Use Cost and Nutrition Data in Labels and Reports (Priority: P3)

**Goal**: Surface saved recipe cost and calorie outputs in printing workflows and recipe-focused management reports.

**Independent Test**: Generate a label or print preview from a calculated recipe version, then open the recipe cost/nutrition reports and confirm both surfaces use the frozen saved values rather than current mutable master-data values.

### Tests for User Story 4

- [ ] T030 [P] [US4] Add integration coverage for recipe cost reports and print payload enrichment in `tests/integration/recipe-costing-reports.spec.ts`
- [ ] T031 [P] [US4] Add unit tests for recipe cost and nutrition report queries in `src/features/reports/queries.recipe-costing.test.ts`

### Implementation for User Story 4

- [ ] T032 [US4] Extend print payload types and recipe or batch nutrition field mapping in `src/features/printing/types.ts` and `src/features/printing/actions.ts`
- [ ] T033 [US4] Render nutrition and cost fields on isolated print label pages in `src/app/[locale]/printing/label/[id]/page.tsx`
- [ ] T034 [US4] Add recipe cost and nutrition report types plus query builders in `src/features/reports/types.ts` and `src/features/reports/queries.ts`
- [ ] T035 [US4] Build the recipe costing and nutrition reports page in `src/app/[locale]/(protected)/reports/recipes/page.tsx`
- [ ] T036 [US4] Extend report export handling and dashboard navigation for recipe costing views in `src/app/api/reports/export/route.ts` and `src/app/[locale]/(protected)/reports/page.tsx`

**Checkpoint**: User Story 4 should now be independently functional for labels, print payloads, and recipe-focused reporting.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish permission coverage, export presentation, responsive behavior, and validation against the quickstart guide.

- [ ] T037 [P] Add permission integration coverage for ingredient reference editing and recipe profitability visibility in `tests/integration/recipe-costing-permissions.spec.ts`
- [ ] T038 Review responsive, empty, and error states for recipe costing UI surfaces in `src/components/recipes/RecipeForm.tsx`, `src/app/[locale]/(protected)/inventory/items/page.tsx`, and `src/app/[locale]/(protected)/reports/recipes/page.tsx`
- [ ] T039 [P] Update currency and calorie export formatting for recipe costing reports in `src/features/reports/exports/excel.ts` and `src/features/reports/exports/pdf.ts`
- [ ] T040 Run the end-to-end validation scenarios documented in `specs/010-recipe-costing-nutrition/quickstart.md`
- [ ] T041 Run `npm run typecheck`, `npm run test`, and targeted Playwright recipe-costing scenarios via `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all story work.
- **User Stories (Phases 3-6)**: All depend on Foundational completion.
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2 and provides the MVP calculation workflow.
- **User Story 2 (P2)**: Starts after Phase 2 and can run in parallel with US1, though it supplies the admin UI for the reference data US1 consumes.
- **User Story 3 (P2)**: Depends on US1 because historical freezing is built on the calculation engine and recipe version flow.
- **User Story 4 (P3)**: Depends on US1 and US3 because labels and reports must use saved calculation snapshots, not transient previews.

### Within Each User Story

- Unit and integration tests should be written before or alongside implementation and must fail before the feature is considered complete.
- Shared models and helper logic come before server actions and UI rendering.
- Server actions and queries come before page wiring and export integration.
- Each story must pass its independent test before moving to the next priority.

### Parallel Opportunities

- Setup tasks `T002` and `T003` can run in parallel.
- Foundational tasks `T006`, `T007`, and `T009` can run in parallel after the schema work is defined.
- US1 tests `T010` and `T011` can run in parallel, as can US1 DTO/UI work `T014` and `T015` after the engine begins.
- US2 tests `T018` and `T019` can run in parallel, and `T021` can proceed in parallel with `T022`.
- US3 tests `T024` and `T025` can run in parallel, and `T028` can proceed in parallel with snapshot persistence after `T026`.
- US4 tests `T030` and `T031` can run in parallel, while `T032` and `T034` can also proceed in parallel before UI wiring.

---

## Parallel Example: User Story 1

```bash
# Write the core calculation tests in parallel:
Task: "Add unit tests for cost, calorie, yield, serving, and unit-conversion formulas in src/lib/recipes/calculations.test.ts"
Task: "Add integration coverage for recipe calculation preview and validation boundaries in tests/integration/recipe-costing.spec.ts"

# Once the calculation engine contract is clear, split DTO and ingredient UI work:
Task: "Extend recipe DTOs with line totals and calculated summary fields in src/features/recipes/types.ts"
Task: "Update ingredient line editing to display normalized line cost and calorie outputs in src/components/recipes/IngredientEditor.tsx"
```

---

## Parallel Example: User Story 4

```bash
# Build reporting and printing in parallel after frozen snapshots exist:
Task: "Extend print payload types and recipe or batch nutrition field mapping in src/features/printing/types.ts and src/features/printing/actions.ts"
Task: "Add recipe cost and nutrition report types plus query builders in src/features/reports/types.ts and src/features/reports/queries.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. **Stop and validate** the independent recipe-calculation workflow before moving on.

### Incremental Delivery

1. Deliver US1 to replace manual spreadsheet-style costing and calorie calculations.
2. Add US2 so admins can manage reference profiles through the UI instead of direct seed data or manual database setup.
3. Add US3 to freeze history and make versioned outputs audit-safe.
4. Add US4 to expose the saved values in labels, print flows, and management reports.
5. Finish with polish, export formatting, permission coverage, and quickstart validation.

### Suggested MVP Scope

- **MVP**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only)
- **Next best increment**: User Story 2, because the admin workflow for reference profile maintenance makes US1 sustainable in day-to-day operations.
