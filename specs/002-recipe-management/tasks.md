# Tasks: Recipe Management Module

**Feature**: `002-recipe-management`
**Input**: Design documents from `/specs/002-recipe-management/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/server-actions.md ✅ · quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.
**Tests**: Not explicitly requested — test tasks are omitted. Add with `/speckit-tasks --tdd` if needed.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prisma schema, shared lib utilities, and permission scaffolding that everything else depends on.

- [X] T001 Add all recipe Prisma models to `prisma/schema.prisma` (RecipeCategory, Recipe, RecipeIngredient, RecipeStep, RecipeVersion, RecipeAssignment, RecipeAuditLog + all ENUMs from data-model.md)
- [X] T002 Run `npx prisma migrate dev --name add_recipe_management` and verify all 7 tables are created
- [X] T003 [P] Create Prisma client singleton in `src/lib/prisma.ts` (if not already present)
- [X] T004 [P] Create RBAC permission helpers in `src/lib/permissions.ts` — export `hasPermission(userId, permissionKey)` and the 8 recipe permission keys (`CREATE_RECIPES`, `EDIT_RECIPES`, `PUBLISH_RECIPES`, `ARCHIVE_RECIPES`, `VIEW_RECIPES`, `VIEW_VERSION_HISTORY`, `MANAGE_RECIPE_CATEGORIES`, `MANAGE_RECIPE_SCOPE`)
- [X] T005 [P] Create shared `ActionResult<T>` type and `ActionErrorCode` union in `src/lib/types/action-result.ts`
- [X] T006 [P] Create recipe snapshot builder in `src/lib/recipes/snapshot.ts` — `buildRecipeSnapshot(recipeId: string): Promise<RecipeSnapshot>` fetches recipe + ingredients + steps + category and returns typed JSON
- [X] T007 [P] Create publish-time validation helper in `src/lib/recipes/validate-publish.ts` — checks nameAr, nameEn, code, categoryId, ≥1 ingredient with quantity > 0, ≥1 step; returns `{ valid: boolean; errors: string[] }`
- [X] T008 [P] Create audit log write helper in `src/lib/recipes/audit.ts` — `writeAuditLog(tx, { recipeId, action, actorId, prevValue, newValue })` wraps `prisma.recipeAuditLog.create` for use inside transactions

**Checkpoint**: Schema migrated, shared utilities ready. No user story work before this phase is complete.

---

## Phase 2: Foundational — Category Management

**Purpose**: Recipe categories must exist before any recipe can be created. This is a hard prerequisite for all recipe user stories.

**⚠️ CRITICAL**: Recipes cannot be assigned a category until this phase is complete.

- [X] T009 Create Server Action `src/actions/recipe-categories/list.ts` — `listRecipeCategories()` returns all active categories as `RecipeCategoryDto[]`; checks `VIEW_RECIPES` permission
- [X] T010 Create Server Action `src/actions/recipe-categories/create.ts` — `createRecipeCategory(input)` validates nameAr (required), nameEn (required), optional description and sortOrder; checks `MANAGE_RECIPE_CATEGORIES` permission; writes `CREATED` audit equivalent
- [X] T011 Create Server Action `src/actions/recipe-categories/update.ts` — `updateRecipeCategory(id, input)` partial update; checks `MANAGE_RECIPE_CATEGORIES` permission
- [X] T012 Create Server Action `src/actions/recipe-categories/archive.ts` — `archiveRecipeCategory(id)` sets `isActive = false`; checks `MANAGE_RECIPE_CATEGORIES` permission
- [X] T013 [P] Create `src/components/recipes/categories/CategoryTable.tsx` — sortable, filterable table of categories with name (AR + EN), status badge, edit and archive actions
- [X] T014 [P] Create `src/components/recipes/categories/CategoryForm.tsx` — React Hook Form + Zod form with nameAr, nameEn, description, sortOrder fields; inline validation messages per constitution IV
- [X] T015 Create category management page `src/app/(dashboard)/recipes/categories/page.tsx` — Server Component; loads categories via `listRecipeCategories()`; renders `CategoryTable`
- [X] T016 Create category create/edit page `src/app/(dashboard)/recipes/categories/[id]/page.tsx` — renders `CategoryForm`; calls `createRecipeCategory` or `updateRecipeCategory` on submit

**Checkpoint**: Categories can be created, listed, edited, and archived. Ready for recipe creation.

---

## Phase 3: User Story 1 — Create and Publish a New Recipe (Priority: P1) 🎯 MVP

**Goal**: Authorized users can create a recipe as Draft, add ingredients (linked to inventory items) and workflow steps, then Publish it — making it Active and selectable for production orders.

**Independent Test**: Create a new recipe via the UI, save as Draft (verify it does NOT appear in production order selector), add ≥1 ingredient and ≥1 step, click Publish, and confirm status changes to Active and the recipe appears in the active recipe list.

### Server Actions

- [X] T017 [P] [US1] Create Server Action `src/actions/recipes/create.ts` — `createRecipe(input)`: creates recipe with `status = DRAFT`, auto-generates code if omitted (`RCP-{padded sequential}`), writes `CREATED` audit log entry inside transaction; checks `CREATE_RECIPES` permission; returns `ActionResult<{ id, code }>`
- [X] T018 [P] [US1] Create Server Action `src/actions/recipes/save-draft.ts` — `saveDraft(id, input, version)`: optimistic lock check (`updateMany` where `version = capturedVersion`), increments `version`, updates recipe fields in-place, writes `DRAFT_SAVED` audit entry; returns `CONFLICT` error code on version mismatch
- [X] T019 [P] [US1] Create Server Action `src/actions/recipes/get.ts` — `getRecipe(id)`: returns `RecipeDetailDto` including ingredients, steps, assignments; enforces `VIEW_RECIPES` + scope filter
- [X] T020 [P] [US1] Create Server Action `src/actions/recipes/list.ts` — `listRecipes(filters, pagination)`: server-side Prisma filtering by search (ILIKE nameAr + nameEn), categoryId, status, departmentId, productionLineId; cursor-based pagination (default page 25); scope enforcement (open-access if no assignments); checks `VIEW_RECIPES`
- [X] T021 [US1] Create Server Action `src/actions/recipes/publish.ts` — `publishRecipe(id, version)`: optimistic lock check, calls `validate-publish.ts`, sets `status = ACTIVE`, increments `publishedVersion`, calls `buildRecipeSnapshot`, creates `RecipeVersion` row, writes `PUBLISHED` audit entry — all inside single `prisma.$transaction`; returns `VALIDATION` error with field list if publish requirements unmet
- [X] T022 [P] [US1] Create Server Action `src/actions/recipes/ingredients/add.ts` — `addIngredient(recipeId, input, recipeVersion)`: validates `inventoryItemId` reference, checks for duplicate `inventoryItemId` in same recipe (returns `{ hasDuplicate: true }` warning in response but does not block save), increments recipe `version`, writes `INGREDIENT_ADDED` audit entry
- [X] T023 [P] [US1] Create Server Action `src/actions/recipes/ingredients/update.ts` — `updateIngredient(recipeId, ingredientId, input, recipeVersion)`: partial update, increments recipe `version`, writes `INGREDIENT_UPDATED` audit entry
- [X] T024 [P] [US1] Create Server Action `src/actions/recipes/ingredients/remove.ts` — `removeIngredient(recipeId, ingredientId, recipeVersion)`: deletes row, increments recipe `version`, writes `INGREDIENT_REMOVED` audit entry
- [X] T025 [P] [US1] Create Server Action `src/actions/recipes/ingredients/reorder.ts` — `reorderIngredients(recipeId, orderedIds, recipeVersion)`: updates `sortOrder` for all ingredient IDs in provided order inside single transaction
- [X] T026 [P] [US1] Create Server Action `src/actions/recipes/steps/add.ts` — `addStep(recipeId, input, recipeVersion)`: creates step, increments recipe `version`, writes `STEP_ADDED` audit entry
- [X] T027 [P] [US1] Create Server Action `src/actions/recipes/steps/update.ts` — `updateStep(recipeId, stepId, input, recipeVersion)`: partial update, increments recipe `version`, writes `STEP_UPDATED` audit entry
- [X] T028 [P] [US1] Create Server Action `src/actions/recipes/steps/delete.ts` — `deleteStep(recipeId, stepId, recipeVersion)`: deletes step, warns if it would leave recipe with 0 steps (returns `{ lastStep: true }` warning), writes `STEP_REMOVED` audit entry
- [X] T029 [P] [US1] Create Server Action `src/actions/recipes/steps/reorder.ts` — `reorderSteps(recipeId, orderedIds, recipeVersion)`: updates `stepNumber` for all step IDs in provided order inside single transaction

### UI Components

- [X] T030 [P] [US1] Create `src/components/recipes/RecipeStatusBadge.tsx` — renders `DRAFT` (gray), `ACTIVE` (green `#4F7A52`), `ARCHIVED` (amber `#D6A04C`) badges using constitution brand colors
- [X] T031 [P] [US1] Create `src/components/recipes/RecipeListTable.tsx` — sortable, filterable table; columns: Code, Name (AR + EN), Category, Status, Yield, Published Version, Last Updated; search bar + status/category filter dropdowns; cursor pagination; uses `RecipeStatusBadge`
- [X] T032 [US1] Create `src/components/recipes/RecipeForm.tsx` — React Hook Form + Zod; sections: Basic Info (nameAr, nameEn, code, category, description), Yield (yieldQuantity + yieldUnit select), Shelf Life (shelfLifeValue + shelfLifeUnit select), Storage (storageMethod enum select + storageNotes conditional on CUSTOM), Production Notes (textarea); all field labels bilingual; inline validation messages
- [X] T033 [US1] Create `src/components/recipes/IngredientEditor.tsx` — drag-to-reorder ingredient list; each row: inventory item search/select (calls inventory items API), quantity input, unit select, purpose input, delete button; duplicate `inventoryItemId` detection triggers inline soft-warning banner ("This ingredient appears multiple times — is this intentional?") without blocking add
- [X] T034 [US1] Create `src/components/recipes/StepEditor.tsx` — drag-to-reorder step list; each row: stepNumber (auto), title input, instructions textarea, estimated duration (minutes) input, `requiresPhoto` and `requiresNotes` toggles, delete button; warn if deleting last step
- [X] T035 [US1] Create `src/components/recipes/PublishButton.tsx` — calls `publishRecipe`; on VALIDATION error renders inline field list highlighting missing items; on CONFLICT error shows reload prompt; on success triggers `router.refresh()`
- [X] T036 [US1] Create recipe list page `src/app/(dashboard)/recipes/page.tsx` — Server Component; loads recipes via `listRecipes`; renders `RecipeListTable`; "New Recipe" button links to `/recipes/new`; page title, breadcrumb navigation per constitution IV
- [X] T037 [US1] Create recipe creation page `src/app/(dashboard)/recipes/new/page.tsx` — calls `createRecipe` on initial load to get a Draft ID, then renders `RecipeForm` + `IngredientEditor` + `StepEditor` + `PublishButton` with auto-save on blur via `saveDraft`
- [X] T038 [US1] Create recipe detail/edit page `src/app/(dashboard)/recipes/[id]/page.tsx` — loads recipe via `getRecipe`; renders `RecipeForm` + `IngredientEditor` + `StepEditor` + `PublishButton`; captures `recipe.version` for optimistic lock; shows status badge prominently; ACTIVE recipe editing drops status to DRAFT on first save

**Checkpoint**: Full Draft → Publish flow works. Active recipes appear in production order selector. Optimistic locking prevents silent overwrites.

---

## Phase 4: User Story 2 — Edit Recipe with Version History (Priority: P2)

**Goal**: Editing an existing recipe preserves a full version history on each publish. Authorized users can view all previous versions in reverse-chronological order.

**Independent Test**: Edit any field on an Active recipe, save (verify status reverts to Draft), publish, then open the version history and confirm two entries exist — v1 (original) and v2 (current) — each with correct author, timestamp, and snapshot data.

### Server Actions

- [X] T039 [P] [US2] Create Server Action `src/actions/recipes/versions.ts` — `getRecipeVersionHistory(id)`: returns `RecipeVersionSummaryDto[]` (versionNumber, publishedAt, publishedByName) ordered descending; checks `VIEW_VERSION_HISTORY` permission (Admin/Supervisor only); returns `UNAUTHORIZED` for Production Staff / Warehouse Staff
- [X] T040 [P] [US2] Create Server Action `src/actions/recipes/version-detail.ts` — `getRecipeVersion(id, versionNumber)`: returns full `RecipeVersionDto` with typed snapshot object; checks `VIEW_VERSION_HISTORY` permission

### UI Components

- [X] T041 [P] [US2] Create `src/components/recipes/VersionHistoryTable.tsx` — table of version entries; columns: Version (v1, v2…), Published By, Published At; each row links to the version detail view; max 50 rows before pagination
- [X] T042 [US2] Create version history page `src/app/(dashboard)/recipes/[id]/versions/page.tsx` — loads version history via `getRecipeVersionHistory`; renders `VersionHistoryTable`; back-link to recipe detail; permission-gated (redirects non-Admin/Supervisor)
- [X] T043 [US2] Create version detail page `src/app/(dashboard)/recipes/[id]/versions/[v]/page.tsx` — read-only view of the full recipe snapshot at that version; renders all fields, ingredients list, steps list with same layout as recipe detail but with a "Read-Only — Version vN" banner; permission-gated

**Checkpoint**: Version history is viewable by Admin/Supervisor. Version detail shows exact snapshot. Production orders can link here.

---

## Phase 5: User Story 3 — Archive and Restore a Recipe (Priority: P2)

**Goal**: Admins can archive a recipe (removing it from production order selectors) with a warning when in-progress orders exist. Archived recipes remain fully accessible for historical records. Admins can restore to Active.

**Independent Test**: Archive a recipe that has ≥1 in-progress production order; confirm the warning dialog lists the order(s); confirm archiving; verify the recipe no longer appears in the production order recipe selector; verify the historical order still shows the correct recipe version detail; verify Admin can restore the recipe to Active.

### Server Actions

- [X] T044 [US3] Create Server Action `src/actions/recipes/archive.ts` — `archiveRecipe(id, force?)`: if `force = false` (default) queries for in-progress production orders referencing this recipe; if found returns `{ warning: true, affectedOrders: ActiveOrderSummary[] }`; if `force = true` OR no active orders: sets `status = ARCHIVED`, writes `ARCHIVED` audit entry; checks `ARCHIVE_RECIPES` permission
- [X] T045 [US3] Create Server Action `src/actions/recipes/restore.ts` — `restoreRecipe(id)`: sets `status = ACTIVE`, writes `RESTORED` audit entry; checks `ARCHIVE_RECIPES` permission

### UI Components

- [X] T046 [US3] Create `src/components/recipes/ArchiveDialog.tsx` — confirmation dialog triggered by "Archive" action button; on open calls `archiveRecipe(id, false)`: if warning response renders a list of affected in-progress orders with their IDs and names before the confirm button; confirm button calls `archiveRecipe(id, true)`; cancel closes dialog; uses constitution Warning color `#D6A04C`
- [X] T047 [US3] Wire "Archive" button and `ArchiveDialog` into recipe detail page `src/app/(dashboard)/recipes/[id]/page.tsx` — visible only for ACTIVE recipes to users with `ARCHIVE_RECIPES` permission
- [X] T048 [US3] Wire "Restore" button into recipe detail page for ARCHIVED recipes — visible only to users with `ARCHIVE_RECIPES` permission; calls `restoreRecipe`; on success refreshes page

**Checkpoint**: Archive/restore flow complete with in-progress order warning. Archived recipes hidden from production selectors.

---

## Phase 6: User Story 4 — Recipe Scope Assignments (Priority: P3)

**Goal**: Admins can restrict a recipe's visibility to specific departments, production lines, or individual users. Users outside the scope cannot see or select the recipe. Unscoped recipes remain globally accessible.

**Independent Test**: Assign a recipe to Department A only. Log in as a Department B user and confirm the recipe does not appear in their recipe list or production order selector. Log in as a Department A user and confirm it does appear. Remove the scope assignment and confirm the recipe becomes globally visible again.

### Server Actions

- [X] T049 [P] [US4] Create Server Action `src/actions/recipes/scope/assign.ts` — `assignScope(recipeId, input)`: creates `RecipeAssignment` row (`scopeType`, `scopeId`); enforces uniqueness; writes `SCOPE_ASSIGNED` audit entry; checks `MANAGE_RECIPE_SCOPE` permission
- [X] T050 [P] [US4] Create Server Action `src/actions/recipes/scope/remove.ts` — `removeScope(recipeId, assignmentId)`: deletes `RecipeAssignment` row; writes `SCOPE_REMOVED` audit entry; checks `MANAGE_RECIPE_SCOPE` permission

### Scope Enforcement

- [X] T051 [US4] Update `src/actions/recipes/list.ts` (`listRecipes`) to apply scope filter: if current user has no global access, add Prisma `where` clause — `OR: [{ assignments: { none: {} } }, { assignments: { some: { OR: [...user's dept/line/user scope filters] } } }]`
- [X] T052 [US4] Update `src/actions/recipes/get.ts` (`getRecipe`) to enforce scope: return `UNAUTHORIZED` if recipe has assignments and current user's dept/line/user_id is not included

### UI Components

- [X] T053 [US4] Create `src/components/recipes/ScopeAssignmentPanel.tsx` — panel shown in recipe detail (admin-only section); lists current scope assignments with scopeType badge and scopeId name lookup; "Add Scope" button opens inline form with scope type select (Department / Production Line / User) + searchable entity select; each existing assignment has a remove button
- [X] T054 [US4] Wire `ScopeAssignmentPanel` into recipe detail page `src/app/(dashboard)/recipes/[id]/page.tsx` — rendered below the main recipe form; visible only to users with `MANAGE_RECIPE_SCOPE` permission

**Checkpoint**: Scope enforcement active. Out-of-scope recipes hidden in all list and selector views.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Audit log visibility, search completeness, responsive polish, and final constitution compliance checks.

- [X] T055 [P] Add audit log read view accessible from recipe detail page — `src/app/(dashboard)/recipes/[id]/audit/page.tsx` — Admin-only; loads `recipeAuditLogs` for this recipe ordered by timestamp DESC; table columns: Action, Actor, Timestamp, Changes summary (diff of prevValue/newValue JSON)
- [X] T056 [P] Implement full search completeness in `listRecipes` — verify ILIKE on `nameAr` AND `nameEn` in the same `OR` clause; verify `categoryId`, `status` array, `departmentId`, `productionLineId` filters all applied correctly; add sort options: nameAr, nameEn, updatedAt, publishedAt, category
- [X] T057 [P] Responsive layout audit — verify recipe list page, recipe detail page, category management page, version history page all render correctly at 1280px (desktop), 768px (tablet), 640px (large mobile); fix any layout breakage per constitution V
- [X] T058 [P] Apply constitution brand colors throughout all recipe components — primary `#A14323`, secondary `#665936`, background `#F7F3EE`, surface `#FFFFFF`, accent `#E1CEBE`, success `#4F7A52`, warning `#D6A04C`, error `#C65A5A`; verify no ad-hoc color values used
- [X] T059 [P] Verify all Server Action permission checks use `hasPermission()` from `src/lib/permissions.ts` — no inline role string checks; verify all 8 recipe permission keys are covered across actions
- [X] T060 [P] Add optimistic lock conflict UX to `RecipeForm` — when `saveDraft` or `publishRecipe` returns `CONFLICT`, display a non-dismissable banner: "This recipe was modified by another user. Reload to get the latest version." with a "Reload" button
- [X] T061 [P] Add recipe code auto-generation in `src/actions/recipes/create.ts` — if `code` is not provided, query the highest existing `RCP-{N}` code and return `RCP-{N+1}` zero-padded to 4 digits (e.g., `RCP-0042`)
- [X] T062 Add yield and shelf life display to `RecipeListTable.tsx` — format: "10 KG", "7 Days" using enum label maps; add tooltip showing storage method on row hover
- [X] T063 [P] Add bilingual name display throughout — all recipe list rows, detail headers, category labels, and version snapshots show both `nameAr` (Cairo font) and `nameEn` (Inter font) stacked or side-by-side per design system

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup / Schema)
    └──► Phase 2 (Category Management) — BLOCKS all recipe phases
              └──► Phase 3 (US1: Create & Publish) 🎯 MVP
              └──► Phase 4 (US2: Version History) — requires US1 publish to generate versions
              └──► Phase 5 (US3: Archive/Restore) — requires US1 Active recipe
              └──► Phase 6 (US4: Scope) — can run in parallel with US2, US3 after US1
                        └──► Phase 7 (Polish) — after all desired stories complete
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|---|---|---|
| US1 — Create & Publish | Phase 1 + Phase 2 complete | Nothing (first) |
| US2 — Version History | US1 (needs published versions to exist) | US3, US4 |
| US3 — Archive/Restore | US1 (needs Active recipe) | US2, US4 |
| US4 — Scope Assignments | US1 (needs recipes) | US2, US3 |

### Within Each Phase

- Server Actions MUST be complete before UI components that call them
- `src/lib/recipes/` utilities (snapshot, validate-publish, audit) MUST be complete before any action that uses them
- `IngredientEditor` + `StepEditor` can be built in parallel
- All tasks marked `[P]` within the same phase can run in parallel

---

## Parallel Execution Examples

### Phase 1 (run together)
```
T003 — prisma.ts
T004 — permissions.ts
T005 — action-result.ts
T006 — snapshot.ts
T007 — validate-publish.ts
T008 — audit.ts
```

### Phase 3 Server Actions (run together after T001–T008 done)
```
T017 — create.ts
T018 — save-draft.ts
T019 — get.ts
T020 — list.ts
T022 — ingredients/add.ts
T023 — ingredients/update.ts
T024 — ingredients/remove.ts
T025 — ingredients/reorder.ts
T026 — steps/add.ts
T027 — steps/update.ts
T028 — steps/delete.ts
T029 — steps/reorder.ts
```
*Then T021 (publish.ts) — depends on T006 (snapshot) and T007 (validate-publish)*

### Phase 3 UI Components (run together after actions done)
```
T030 — RecipeStatusBadge.tsx
T031 — RecipeListTable.tsx
T033 — IngredientEditor.tsx
T034 — StepEditor.tsx
```
*Then T032 (RecipeForm) → T035 (PublishButton) → T036+T037+T038 (pages)*

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete **Phase 1** — schema + utilities
2. Complete **Phase 2** — category management (required prerequisite)
3. Complete **Phase 3** — full Draft → Publish flow
4. **STOP and VALIDATE**: Create a recipe as Draft → add ingredients/steps → publish → confirm Active status → confirm version v1 created
5. This MVP covers all P1 requirements and is independently deployable

### Incremental Delivery

1. Phase 1 + Phase 2 → **Foundation ready**
2. Phase 3 → **MVP: Recipes can be created, edited, and published** ✅
3. Phase 4 → **Version history visible to Admin/Supervisor** ✅
4. Phase 5 → **Archive/restore with safety warnings** ✅
5. Phase 6 → **Scope restrictions active** ✅
6. Phase 7 → **Production-ready polish** ✅

### Parallel Team Strategy

With 2+ developers post-Phase 2:
- **Dev A**: Phase 3 Server Actions (T017–T029)
- **Dev B**: Phase 3 UI Components (T030–T038)
- Both merge when actions and components are ready to wire together

---

## Notes

- `[P]` tasks operate on different files with no shared dependencies — safe to run concurrently
- All Server Actions must call `hasPermission()` as their first operation before any DB access
- Optimistic locking (`version` counter) must be threaded through every save/publish/ingredient/step action
- All DB writes that are not pure reads must include an `audit.ts` `writeAuditLog` call inside the same `prisma.$transaction`
- Commit after each task or logical group; push after each phase checkpoint
- Run `npx prisma studio` after Phase 1 to verify schema before writing any actions
