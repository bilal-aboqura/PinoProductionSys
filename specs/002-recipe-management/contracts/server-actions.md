# Server Action Contracts: Recipe Management Module

**Branch**: `002-recipe-management` | **Phase**: 1 | **Date**: 2026-06-12

All contracts are Next.js 15 Server Actions. They are called directly from React Server Components and Client Components. There are no REST API route handlers for these operations (internal use only).

---

## Shared Types

```typescript
// Result type used by all Server Actions
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: ActionErrorCode };

type ActionErrorCode =
  | "UNAUTHORIZED"        // caller lacks permission
  | "NOT_FOUND"           // entity does not exist
  | "CONFLICT"            // optimistic lock mismatch
  | "VALIDATION"          // input failed Zod validation
  | "ARCHIVE_BLOCKED"     // reserved for future use
  | "INTERNAL";           // unexpected server error
```

---

## Category Actions

### `createRecipeCategory(input)`
**File**: `actions/recipe-categories/create.ts`

```typescript
input: {
  nameAr: string;   // required, min 2, max 100
  nameEn: string;   // required, min 2, max 100
  description?: string;
  sortOrder?: number;
}
returns: ActionResult<{ id: string }>
permissions: MANAGE_RECIPE_CATEGORIES
```

### `updateRecipeCategory(id, input)`
**File**: `actions/recipe-categories/update.ts`

```typescript
input: {
  nameAr?: string;
  nameEn?: string;
  description?: string;
  sortOrder?: number;
}
returns: ActionResult<void>
permissions: MANAGE_RECIPE_CATEGORIES
```

### `archiveRecipeCategory(id)`
**File**: `actions/recipe-categories/archive.ts`

```typescript
returns: ActionResult<void>
permissions: MANAGE_RECIPE_CATEGORIES
side-effects: Sets isActive = false. Recipes using this category retain reference.
```

### `listRecipeCategories()`
**File**: `actions/recipe-categories/list.ts`

```typescript
returns: ActionResult<RecipeCategoryDto[]>
permissions: VIEW_RECIPES (any authenticated user with recipe access)
```

---

## Recipe Actions

### `createRecipe(input)`
**File**: `actions/recipes/create.ts`

```typescript
input: {
  nameAr: string;
  nameEn?: string;         // optional at draft save
  code?: string;           // optional — auto-generated if omitted
  categoryId?: string;     // optional at draft save
  description?: string;
  yieldQuantity?: number;
  yieldUnit?: YieldUnit;
  shelfLifeValue?: number;
  shelfLifeUnit?: ShelfLifeUnit;
  storageMethod?: StorageMethod;
  storageNotes?: string;
  productionNotes?: string;
}
returns: ActionResult<{ id: string; code: string }>
permissions: CREATE_RECIPES
side-effects:
  - Creates recipe with status = DRAFT
  - Writes CREATED audit log entry
```

### `saveDraft(id, input, version)`
**File**: `actions/recipes/save-draft.ts`

```typescript
input: {
  nameAr?: string;
  nameEn?: string;
  code?: string;
  categoryId?: string;
  description?: string;
  yieldQuantity?: number;
  yieldUnit?: YieldUnit;
  shelfLifeValue?: number;
  shelfLifeUnit?: ShelfLifeUnit;
  storageMethod?: StorageMethod;
  storageNotes?: string;
  productionNotes?: string;
}
version: number   // optimistic lock — must match current recipes.version
returns: ActionResult<{ newVersion: number }>
permissions: EDIT_RECIPES
errors:
  - CONFLICT if version mismatch
  - NOT_FOUND if recipe does not exist
side-effects:
  - Updates recipe in-place, increments version counter
  - Does NOT create a RecipeVersion row
  - Writes DRAFT_SAVED audit log entry
```

### `publishRecipe(id, version)`
**File**: `actions/recipes/publish.ts`

```typescript
version: number   // optimistic lock
returns: ActionResult<{ publishedVersion: number }>
permissions: PUBLISH_RECIPES
errors:
  - CONFLICT if version mismatch
  - VALIDATION if required fields missing (nameAr, nameEn, code, categoryId, ≥1 ingredient, ≥1 step)
  - NOT_FOUND
side-effects:
  - Validates all publish-required fields
  - Sets status = ACTIVE
  - Increments publishedVersion
  - Creates RecipeVersion row with full JSON snapshot
  - Writes PUBLISHED audit log entry
```

### `archiveRecipe(id, force?)`
**File**: `actions/recipes/archive.ts`

```typescript
force?: boolean   // if false (default), returns warning if in-progress orders exist
returns:
  | ActionResult<{ archived: true }>
  | ActionResult<{ warning: true; affectedOrders: ActiveOrderSummary[] }>
permissions: ARCHIVE_RECIPES
side-effects (when archived):
  - Sets status = ARCHIVED
  - Writes ARCHIVED audit log entry
```

### `restoreRecipe(id)`
**File**: `actions/recipes/restore.ts`

```typescript
returns: ActionResult<void>
permissions: ARCHIVE_RECIPES
side-effects:
  - Sets status = ACTIVE
  - Writes RESTORED audit log entry
```

### `getRecipe(id)`
**File**: `actions/recipes/get.ts`

```typescript
returns: ActionResult<RecipeDetailDto>
permissions: VIEW_RECIPES + scope enforcement
```

### `listRecipes(filters, pagination)`
**File**: `actions/recipes/list.ts`

```typescript
filters: {
  search?: string;            // searches nameAr + nameEn
  categoryId?: string;
  status?: RecipeStatus | RecipeStatus[];
  departmentId?: string;
  productionLineId?: string;
}
pagination: {
  cursor?: string;
  pageSize?: number;          // default 25, max 100
}
returns: ActionResult<{ items: RecipeListItemDto[]; nextCursor?: string; total: number }>
permissions: VIEW_RECIPES + scope enforcement
```

### `getRecipeVersionHistory(id)`
**File**: `actions/recipes/versions.ts`

```typescript
returns: ActionResult<RecipeVersionSummaryDto[]>
permissions: VIEW_VERSION_HISTORY (Admin/Supervisor only)
```

### `getRecipeVersion(id, versionNumber)`
**File**: `actions/recipes/version-detail.ts`

```typescript
returns: ActionResult<RecipeVersionDto>
permissions: VIEW_VERSION_HISTORY
```

---

## Ingredient Actions

### `addIngredient(recipeId, input, recipeVersion)`
**File**: `actions/recipes/ingredients/add.ts`

```typescript
input: {
  inventoryItemId: string;
  quantity: number;
  unit: string;
  purpose?: string;
  sortOrder?: number;
}
returns: ActionResult<{ id: string }>
permissions: EDIT_RECIPES
side-effects:
  - Adds ingredient to recipe
  - Increments recipe.version (optimistic lock counter)
  - Writes INGREDIENT_ADDED audit log
  - If duplicate inventoryItemId in same recipe: proceeds with soft warning in response
```

### `updateIngredient(recipeId, ingredientId, input, recipeVersion)`
**File**: `actions/recipes/ingredients/update.ts`

```typescript
input: {
  quantity?: number;
  unit?: string;
  purpose?: string;
  sortOrder?: number;
}
returns: ActionResult<void>
permissions: EDIT_RECIPES
side-effects: Writes INGREDIENT_UPDATED audit log
```

### `removeIngredient(recipeId, ingredientId, recipeVersion)`
**File**: `actions/recipes/ingredients/remove.ts`

```typescript
returns: ActionResult<void>
permissions: EDIT_RECIPES
side-effects: Writes INGREDIENT_REMOVED audit log
```

### `reorderIngredients(recipeId, orderedIds, recipeVersion)`
**File**: `actions/recipes/ingredients/reorder.ts`

```typescript
orderedIds: string[]   // full ordered list of ingredient IDs
returns: ActionResult<void>
permissions: EDIT_RECIPES
```

---

## Step Actions

### `addStep(recipeId, input, recipeVersion)`
**File**: `actions/recipes/steps/add.ts`

```typescript
input: {
  stepNumber: number;
  title: string;
  instructions: string;
  estimatedMinutes?: number;
  requiresPhoto?: boolean;
  requiresNotes?: boolean;
}
returns: ActionResult<{ id: string }>
permissions: EDIT_RECIPES
side-effects: Writes STEP_ADDED audit log
```

### `updateStep(recipeId, stepId, input, recipeVersion)`
**File**: `actions/recipes/steps/update.ts`

```typescript
input: Partial<StepInput>
returns: ActionResult<void>
permissions: EDIT_RECIPES
side-effects: Writes STEP_UPDATED audit log
```

### `deleteStep(recipeId, stepId, recipeVersion)`
**File**: `actions/recipes/steps/delete.ts`

```typescript
returns: ActionResult<void>
permissions: EDIT_RECIPES
side-effects: Writes STEP_REMOVED audit log
```

### `reorderSteps(recipeId, orderedIds, recipeVersion)`
**File**: `actions/recipes/steps/reorder.ts`

```typescript
orderedIds: string[]
returns: ActionResult<void>
permissions: EDIT_RECIPES
```

---

## Scope Assignment Actions

### `assignScope(recipeId, input)`
**File**: `actions/recipes/scope/assign.ts`

```typescript
input: {
  scopeType: ScopeType;
  scopeId: string;
}
returns: ActionResult<void>
permissions: MANAGE_RECIPE_SCOPE
side-effects: Writes SCOPE_ASSIGNED audit log
```

### `removeScope(recipeId, assignmentId)`
**File**: `actions/recipes/scope/remove.ts`

```typescript
returns: ActionResult<void>
permissions: MANAGE_RECIPE_SCOPE
side-effects: Writes SCOPE_REMOVED audit log
```

---

## DTO Shapes

```typescript
interface RecipeListItemDto {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  status: RecipeStatus;
  categoryNameAr: string;
  categoryNameEn: string;
  publishedVersion: number;
  updatedAt: string;          // ISO 8601
}

interface RecipeDetailDto {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  status: RecipeStatus;
  category: { id: string; nameAr: string; nameEn: string };
  description?: string;
  yieldQuantity: string;      // Decimal as string
  yieldUnit: YieldUnit;
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
  storageMethod: StorageMethod;
  storageNotes?: string;
  productionNotes?: string;
  version: number;            // optimistic lock value
  publishedVersion: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
  assignments: RecipeAssignmentDto[];
}

interface RecipeVersionSummaryDto {
  versionNumber: number;
  publishedAt: string;
  publishedByName: string;
}

interface RecipeVersionDto extends RecipeVersionSummaryDto {
  snapshot: RecipeSnapshot;   // full typed snapshot object
}
```
