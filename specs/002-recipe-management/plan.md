# Implementation Plan: Recipe Management Module

**Branch**: `002-recipe-management` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-recipe-management/spec.md`

---

## Summary

Build the Recipe Management module — the authoritative source of truth for all production procedures in PinoProductionSys. Recipes define ingredients (linked to inventory items), ordered production steps, shelf life, storage rules, and production yield. They are consumed by production orders, inventory consumption, batch tracking, QR labels, expiry calculations, and production reports.

The module implements a **Draft → Active → Archived** lifecycle with explicit publish actions, full JSON version snapshots on each publish, optimistic locking for concurrent edit safety, configurable RBAC scope assignments, bilingual (Arabic/English) recipe names, and an immutable append-only audit log.

**Tech stack**: Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui · React Hook Form · Zod · PostgreSQL (Supabase) · Prisma · Next.js Server Actions

---

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 18+
**Primary Dependencies**: Next.js 15, Prisma 5.x, shadcn/ui, React Hook Form, Zod, Tailwind CSS
**Storage**: PostgreSQL 15 via Supabase (hosted)
**Testing**: Vitest (unit), Playwright (integration/E2E), standard permission test harness
**Target Platform**: Web — desktop primary, tablet/large mobile responsive
**Project Type**: Web application (Next.js full-stack with Server Actions)
**Performance Goals**: Recipe list <500ms · Recipe search <500ms · Recipe open <1s (aligns with constitution VI)
**Constraints**: Constitution performance standards · RBAC on all routes · Soft-deletes (archive) required · Audit log on all writes
**Scale/Scope**: Hundreds of recipes · Thousands of recipe versions · Thousands of audit log entries · 30+ concurrent users

---

## Constitution Check

*GATE: Verified before Phase 0. Re-verified after Phase 1.*

- [x] **I. Simplicity**: Server Actions + Prisma is the minimal stack. No extra repository layer. No over-abstraction.
- [x] **II. Business First**: Core operational feature — recipes are required by production orders, inventory consumption, batch tracking, QR labels, and reports.
- [x] **III. Traceability**: Every write (create, draft save, publish, archive, restore, ingredient add/edit/remove, step add/edit/remove, scope changes) writes to `recipe_audit_logs` inside the same DB transaction. Immutable. Captures who/when/what (prev + new JSON values).
- [x] **IV. Consistent UX**: Uses established shadcn/ui component patterns (tables, forms, badges, dialogs). Brand colors and typography from constitution enforced.
- [x] **V. Responsive**: Pages tested at desktop (1280px+), tablet (768–1279px), large mobile (640–767px).
- [x] **VI. Performance**: Server-side filtering with Prisma. Cursor-based pagination (page size 25). DB indexes on status, category, name (GIN). All targets within constitution bounds.
- [x] **VII. Security**: RBAC permission checks at Server Action entry point. Scope enforcement in all list/get queries. No client-side security. All auth via session middleware.
- [x] **VIII. Testing**: Unit (validate-publish, snapshot builder, optimistic lock logic), integration (draft→publish, archive, conflict, version retrieval), permission tests (all actions), validation tests (boundary cases).

**No violations. No complexity tracking entries required.**

---

## Project Structure

### Documentation (this feature)

```text
specs/002-recipe-management/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Phase 0: technical decisions
├── data-model.md        ← Phase 1: Prisma schema, state machine, indexes
├── quickstart.md        ← Phase 1: setup, layout, patterns
├── contracts/
│   └── server-actions.md ← Phase 1: all action signatures + DTOs
└── tasks.md             ← Phase 2 output (via /speckit-tasks)
```

### Source Code Layout

```text
src/
├── app/
│   └── (dashboard)/
│       └── recipes/
│           ├── page.tsx                        # Recipe list (Server Component)
│           ├── new/page.tsx                    # Create recipe
│           └── [id]/
│               ├── page.tsx                    # Detail / edit
│               ├── versions/page.tsx           # Version history
│               └── versions/[v]/page.tsx       # Version detail (read-only)
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
│       │   ├── add.ts · update.ts · remove.ts · reorder.ts
│       ├── steps/
│       │   ├── add.ts · update.ts · delete.ts · reorder.ts
│       └── scope/
│           ├── assign.ts · remove.ts
│
├── components/
│   └── recipes/
│       ├── RecipeListTable.tsx
│       ├── RecipeStatusBadge.tsx
│       ├── RecipeForm.tsx
│       ├── IngredientEditor.tsx
│       ├── StepEditor.tsx
│       ├── PublishButton.tsx
│       ├── ArchiveDialog.tsx
│       ├── VersionHistoryTable.tsx
│       └── ScopeAssignmentPanel.tsx
│
├── lib/
│   ├── prisma.ts
│   ├── permissions.ts
│   └── recipes/
│       ├── snapshot.ts
│       ├── validate-publish.ts
│       └── audit.ts
│
└── prisma/
    └── schema.prisma
```

**Structure Decision**: Standard Next.js 15 App Router layout. Server Actions collocated under `/actions/` by domain. Components scoped to `/components/recipes/`. Business logic isolated in `/lib/recipes/`. No separate backend — Next.js handles both frontend and data access.

---

## Phase 0 — Research Summary

All 10 technical decisions resolved. See [research.md](./research.md) for full rationale.

| Decision | Resolution |
|----------|-----------|
| Versioning strategy | Full JSON snapshot per publish (JSONB column) |
| Optimistic locking | `version` integer counter + `updateMany` transaction check |
| Ingredient linkage | FK to `inventory_items` — no free text |
| Draft save vs publish | Draft = in-place update; Publish = new `RecipeVersion` row |
| Scope enforcement | Server Action layer filter; open-access default if no assignments |
| Audit log storage | Append-only table; written inside same transaction as primary write |
| Bilingual fields | `name_ar` + `name_en` columns; both required at publish |
| Units | PostgreSQL ENUMs via Prisma for shelf life and yield units |
| Storage method | ENUM + optional `storage_notes` free text |
| Search & filter | Server-side Prisma `where` + cursor pagination; ILIKE for name search |

---

## Phase 1 — Design Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Data Model | [data-model.md](./data-model.md) | ✅ Complete |
| Server Action Contracts | [contracts/server-actions.md](./contracts/server-actions.md) | ✅ Complete |
| Quickstart Guide | [quickstart.md](./quickstart.md) | ✅ Complete |

### Key Design Decisions

**Recipe Status**: `DRAFT | ACTIVE | ARCHIVED` (no intermediate states)

**Version Numbering**: Monotonic integer per recipe (`v1`, `v2`, `v3`). Production orders store `recipeVersionId` FK pointing to the immutable snapshot row.

**Ingredient Duplicate Policy**: Allowed. System writes soft warning to response when `inventoryItemId` appears more than once in the same recipe. Does not block save.

**Archive Safety**: `archiveRecipe(id, force=false)` returns a warning payload listing in-progress orders if any exist. Caller must re-call with `force=true` to confirm. Production orders with this recipe are unaffected — they reference immutable `RecipeVersion` snapshots.

**RBAC Permissions** (configurable defaults):
| Permission Key | Default: Admin | Default: Supervisor | Default: Prod Staff | Default: Warehouse |
|---|---|---|---|---|
| `CREATE_RECIPES` | ✅ | ✅ | ❌ | ❌ |
| `EDIT_RECIPES` | ✅ | ✅ | ❌ | ❌ |
| `PUBLISH_RECIPES` | ✅ | ✅ | ❌ | ❌ |
| `ARCHIVE_RECIPES` | ✅ | ❌ | ❌ | ❌ |
| `VIEW_RECIPES` | ✅ | ✅ | ✅ | ✅* |
| `VIEW_VERSION_HISTORY` | ✅ | ✅ | ❌ | ❌ |
| `MANAGE_RECIPE_CATEGORIES` | ✅ | ❌ | ❌ | ❌ |
| `MANAGE_RECIPE_SCOPE` | ✅ | ❌ | ❌ | ❌ |

*Warehouse: VIEW_RECIPES configurable (off by default, on if granted).

---

## Complexity Tracking

*No constitution violations. No entries required.*

---

## Next Step

Run `/speckit-tasks` to generate the actionable, dependency-ordered implementation task list from this plan.
