# Research: Production Orders

**Feature**: `003-production-orders`  
**Phase**: 0 — Research & Decision Log  
**Date**: 2026-06-13

---

## 1. Recipe Version Locking Strategy

**Decision**: Store the `recipeVersionId` (FK to `recipe_versions`) on `ProductionOrder` at creation time. The `recipe_versions.snapshot` JSON field already contains the full recipe snapshot (name, yield, steps, requirements). No additional snapshot table needed.

**Rationale**: The existing `RecipeVersion` model already stores a complete `snapshot: Json` field populated at publish time by `buildRecipeSnapshot()`. Linking an order to a `RecipeVersion` row gives us a permanent, immutable reference without duplication. If the recipe is later archived or re-published, the order still resolves to its locked version via `recipeVersionId → RecipeVersion.snapshot`.

**Alternatives considered**:
- Duplicate snapshot onto `ProductionOrder`: Rejected — creates data duplication; the existing `RecipeVersion.snapshot` already serves this purpose.
- Store only `recipeId` with version number: Rejected — requires a compound lookup and is more fragile if rows are ever cleaned up.

---

## 2. Step Execution Model

**Decision**: Each `ProductionOrderStep` row represents one step's execution state within an order. It is seeded at order creation time (one row per step in the locked recipe version's snapshot) and updated in place as the step is completed.

**Rationale**: Pre-seeding all step rows at creation time allows the UI to show the full step list immediately (including future locked steps) without additional queries. It also simplifies the "all steps completed?" completion check to a single count query.

**Alternatives considered**:
- Create step rows only when each step starts: Rejected — makes it harder to display the full step list upfront and requires more complex completion checks.
- Store steps as a JSON array on the order: Rejected — loses relational queryability, makes per-step photo/note attachment harder, and prevents indexing.

---

## 3. Photo Storage

**Decision**: Use the existing Supabase Storage infrastructure. Photos are uploaded via a Next.js Route Handler (`/api/production-orders/[id]/steps/[stepId]/photo`) that:
1. Validates auth and permission
2. Uploads the file to a private `production-evidence` bucket
3. Records the storage path in `ProductionOrderStepPhoto`

**Rationale**: Supabase Storage is already configured for the project. Using a Route Handler (not a Server Action) for the binary upload avoids `multipart/form-data` limitations of Server Actions and allows proper streaming. The storage path (not a public URL) is stored in the database; presigned URLs are generated on-demand for display.

**Alternatives considered**:
- Server Action for file upload: Rejected — Server Actions do not handle streaming binary data well and have payload size limits.
- Direct client-to-Supabase upload: Rejected — exposes storage credentials to the client and bypasses auth/permission checks.

---

## 4. Concurrent Access Protection

**Decision**: Use optimistic locking via a `version: Int` field on `ProductionOrder`. Each mutating Server Action reads the current version, performs the mutation within a `prisma.$transaction`, and increments the version. If the version at read time doesn't match what's in the DB at write time, the transaction is aborted and the client receives a `CONFLICT` error.

**Rationale**: This is the same pattern already used by the recipe module (`saveDraft`, `publishRecipe`). It is simple, requires no external locking infrastructure, and is consistent with the codebase.

**Alternatives considered**:
- Pessimistic row-level DB lock: Rejected — adds complexity and can cause lock contention under load.
- Application-level mutex (Redis): Rejected — adds an external dependency not present in the stack.

---

## 5. Production Start Time Semantics

**Decision**: `startedAt` is written once, on the first mutation that transitions the order to `IN_PROGRESS`. Whether triggered by the explicit "Start Production" action or implicitly by the first step completion, the Server Action checks `startedAt IS NULL` before writing it. A subsequent call from the other path is a no-op for `startedAt`.

**Rationale**: The spec requires that start time is recorded only once, from whichever trigger fires first. A simple `startedAt IS NULL` guard inside the transaction makes this idempotent without additional state.

---

## 6. Permission Model Extension

**Decision**: Introduce new permission codes under the `production-orders:` namespace, following the existing pattern in `src/lib/permissions.ts`:

| Code | Description |
|---|---|
| `production-orders:view` | View production orders (own or all, depending on role) |
| `production-orders:create` | Create new production orders (category-scoped for staff) |
| `production-orders:assign` | Pre-assign an order to a staff member |
| `production-orders:claim` | Self-claim an unassigned order from the queue |
| `production-orders:execute` | Execute steps on an assigned order |
| `production-orders:complete` | Mark an order as completed |
| `production-orders:cancel` | Cancel an order (supervisor-level only) |
| `production-orders:view_all` | View all orders regardless of assignment (supervisor/admin) |

**Category-scoped creation**: Enforced at the Server Action layer by querying `UserRecipeCategory` for the acting user and filtering the allowed recipe list. The `production-orders:create` permission is a prerequisite; the category scope is an additional data-level gate. The existing `UserRecipeCategory` join table already models this relationship.

---

## 7. Status Lifecycle Mapping

```
PENDING_UNASSIGNED  →  PENDING (on claim/assign)
PENDING             →  IN_PROGRESS (on "Start Production" or first step completion)
IN_PROGRESS         →  COMPLETED (on finalize, all steps done + quantity recorded)
PENDING / IN_PROGRESS → CANCELLED (supervisor only, irreversible)
```

Implemented as a Prisma enum `ProductionOrderStatus`:
```
PENDING_UNASSIGNED
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
```

Status transitions are validated by a pure `assertValidTransition(from, to)` guard function in `src/features/production-orders/lib/status.ts` — unit-testable with no DB dependency.

---

## 8. Audit Log Integration

**Decision**: Extend the existing `AuditAction` Prisma enum with production order actions. Each Server Action writes to the existing `AuditLog` model (the global audit log) using a helper modeled on the existing `writeAuditLog` function in `src/lib/recipes/audit.ts`.

**New `AuditAction` values**:
```
PRODUCTION_ORDER_CREATED
PRODUCTION_ORDER_ASSIGNED
PRODUCTION_ORDER_CLAIMED
PRODUCTION_ORDER_STARTED
PRODUCTION_ORDER_STEP_COMPLETED
PRODUCTION_ORDER_PHOTO_UPLOADED
PRODUCTION_ORDER_NOTE_ADDED
PRODUCTION_ORDER_QUANTITY_CONFIRMED
PRODUCTION_ORDER_COMPLETED
PRODUCTION_ORDER_CANCELLED
```

**Rationale**: The existing `AuditLog` model is already used for system-wide audit events and covers the required who/when/what fields. Extending the enum is simpler than a separate `ProductionAuditLog` table and keeps audit queries unified.

---

## 9. Order Number Generation

**Decision**: Auto-generate human-readable order numbers in format `PO-YYYYMMDD-NNNN` (e.g., `PO-20260613-0001`) where `NNNN` is a daily sequential counter. This is generated server-side at creation time using a DB query for `MAX` on the day's prefix.

**Rationale**: Human-readable order numbers are essential for production floor communication (staff calling out order numbers verbally or on paper). The date prefix prevents ambiguity across days. The NNNN suffix is padded for legibility.

---

## 10. File Structure Decision

Follows the established feature pattern exactly:
- `src/features/production-orders/` — all business logic (actions, queries, types, lib)
- `src/components/production-orders/` — all UI components
- `src/app/[locale]/(protected)/production/` — Next.js App Router pages

No new patterns or directories introduced.
