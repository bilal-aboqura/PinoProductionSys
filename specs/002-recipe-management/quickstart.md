# Quickstart: Recipe Management Module

**Branch**: `002-recipe-management` | **Phase**: 1 | **Date**: 2026-06-12

This guide explains how to start implementing and testing the Recipe Management module.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| PostgreSQL | 15+ (via Supabase) | Database |
| Prisma CLI | 5.x | Schema migrations |
| pnpm / npm | latest | Package manager |

---

## Project Source Layout

```
src/
├── app/
│   └── (dashboard)/
│       └── recipes/
│           ├── page.tsx                  # Recipe list page (Server Component)
│           ├── new/
│           │   └── page.tsx              # Create recipe page
│           └── [id]/
│               ├── page.tsx              # Recipe detail/edit page
│               ├── versions/
│               │   └── page.tsx          # Version history page
│               └── versions/[v]/
│                   └── page.tsx          # Version detail page
│
├── actions/
│   ├── recipe-categories/
│   │   ├── create.ts
│   │   ├── update.ts
│   │   ├── archive.ts
│   │   └── list.ts
│   └── recipes/
│       ├── create.ts
│       ├── save-draft.ts
│       ├── publish.ts
│       ├── archive.ts
│       ├── restore.ts
│       ├── get.ts
│       ├── list.ts
│       ├── versions.ts
│       ├── version-detail.ts
│       ├── ingredients/
│       │   ├── add.ts
│       │   ├── update.ts
│       │   ├── remove.ts
│       │   └── reorder.ts
│       ├── steps/
│       │   ├── add.ts
│       │   ├── update.ts
│       │   ├── delete.ts
│       │   └── reorder.ts
│       └── scope/
│           ├── assign.ts
│           └── remove.ts
│
├── components/
│   └── recipes/
│       ├── RecipeListTable.tsx           # Filterable, sortable recipe table
│       ├── RecipeStatusBadge.tsx         # Draft / Active / Archived badge
│       ├── RecipeForm.tsx                # Unified create/edit form
│       ├── IngredientEditor.tsx          # Drag-reorder ingredient list
│       ├── StepEditor.tsx                # Drag-reorder step list
│       ├── PublishButton.tsx             # Publish action with validation feedback
│       ├── ArchiveDialog.tsx             # Archive confirmation + active orders warning
│       ├── VersionHistoryTable.tsx       # Version list for sidebar/page
│       └── ScopeAssignmentPanel.tsx      # Department/line/user scope UI
│
├── lib/
│   ├── prisma.ts                         # Prisma client singleton
│   ├── permissions.ts                    # RBAC helpers
│   └── recipes/
│       ├── snapshot.ts                   # Build snapshot JSON for RecipeVersion
│       ├── validate-publish.ts           # Publish-time validation logic
│       └── audit.ts                      # Audit log write helpers
│
└── prisma/
    └── schema.prisma                     # Includes recipe models (see data-model.md)
```

---

## Database Setup

### 1. Add recipe models to Prisma schema

Copy the schema from [data-model.md](../data-model.md) into `prisma/schema.prisma`.

### 2. Run migration

```bash
npx prisma migrate dev --name add_recipe_management
```

### 3. Verify tables created

```bash
npx prisma studio
# Check: recipe_categories, recipes, recipe_ingredients, recipe_steps,
#        recipe_versions, recipe_assignments, recipe_audit_logs
```

---

## Implementation Order (Recommended)

Follow this order to build incrementally with testable milestones at each step:

### Step 1 — Database & Schema
- Add Prisma models
- Run migration
- Seed a test category and recipe

### Step 2 — Category Management
- `createRecipeCategory`, `updateRecipeCategory`, `archiveRecipeCategory`, `listRecipeCategories`
- Category admin UI

### Step 3 — Recipe CRUD (Draft only)
- `createRecipe`, `saveDraft`
- Recipe list page with status filter
- Recipe create/edit form (basic fields only — no ingredients/steps yet)

### Step 4 — Ingredients & Steps
- Ingredient add/update/remove/reorder actions
- Step add/update/delete/reorder actions
- `IngredientEditor` and `StepEditor` components with drag-to-reorder

### Step 5 — Publish Workflow
- `publishRecipe` action with full validation
- `PublishButton` component with inline error display
- `RecipeVersion` creation and snapshot storage

### Step 6 — Archive & Restore
- `archiveRecipe` with active order warning
- `restoreRecipe`
- `ArchiveDialog` component

### Step 7 — Version History
- `getRecipeVersionHistory`, `getRecipeVersion`
- Version history table and version detail view
- Link from production orders to version detail (read-only)

### Step 8 — Scope Assignments
- `assignScope`, `removeScope`
- Scope assignment panel
- Scope enforcement in `listRecipes` and `getRecipe`

### Step 9 — Audit Log
- Verify all audit entries written correctly across all actions
- Audit log read view (admin only)

### Step 10 — Search & Filtering
- Full filter implementation in `listRecipes`
- Search by nameAr / nameEn
- Filter by category, status, department, production line

---

## Key Implementation Notes

### Optimistic Locking Pattern

```typescript
// In every save/publish action:
const updated = await prisma.recipe.updateMany({
  where: { id, version: capturedVersion },
  data: { ...updates, version: { increment: 1 } }
});

if (updated.count === 0) {
  return { success: false, error: "Conflict", code: "CONFLICT" };
}
```

### Audit Log Pattern

```typescript
// Always inside same transaction as the primary write:
await prisma.$transaction([
  prisma.recipe.update({ where: { id }, data: updates }),
  prisma.recipeAuditLog.create({
    data: {
      recipeId: id,
      action: "DRAFT_SAVED",
      actorId: session.user.id,
      prevValue: previousSnapshot,
      newValue: newSnapshot,
    }
  })
]);
```

### Snapshot Builder

```typescript
// lib/recipes/snapshot.ts
export async function buildRecipeSnapshot(recipeId: string): Promise<RecipeSnapshot> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    include: { ingredients: true, steps: true, category: true }
  });
  return {
    recipeId: recipe.id,
    versionNumber: recipe.publishedVersion + 1,
    nameAr: recipe.nameAr,
    nameEn: recipe.nameEn,
    // ... map all fields
  };
}
```

### Scope Enforcement Pattern

```typescript
// In listRecipes action:
const scopeFilter = userHasGlobalAccess(session.user) ? {} : {
  OR: [
    { assignments: { none: {} } }, // no restrictions = globally accessible
    { assignments: { some: {
      OR: [
        { scopeType: "DEPARTMENT", scopeId: session.user.departmentId },
        { scopeType: "USER", scopeId: session.user.id },
        ...(session.user.productionLineIds.map(id => ({
          scopeType: "PRODUCTION_LINE", scopeId: id
        })))
      ]
    }}}
  ]
};
```

---

## Testing Checklist

- [ ] Unit: `validate-publish.ts` — all required field combinations
- [ ] Unit: `snapshot.ts` — snapshot completeness and field mapping
- [ ] Unit: Optimistic lock conflict scenario
- [ ] Integration: Full draft → publish flow
- [ ] Integration: Archive with active orders warning
- [ ] Integration: Concurrent edit conflict (two sessions)
- [ ] Integration: Version snapshot retrieval by production order
- [ ] Permission: UNAUTHORIZED response for all actions without permission
- [ ] Permission: Scope-restricted recipe hidden from out-of-scope user list
- [ ] Validation: Publish rejected when ≥1 required field missing
- [ ] Validation: Duplicate ingredient triggers soft warning, does not block save
