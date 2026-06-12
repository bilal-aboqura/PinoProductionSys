# Research: Recipe Management Module

**Branch**: `002-recipe-management` | **Phase**: 0 | **Date**: 2026-06-12

---

## Decision 1: Versioning Strategy — Full Snapshot vs. Delta

**Decision**: Full JSON snapshot per published version stored in `recipe_versions.snapshot` (JSONB column).

**Rationale**: Production orders need to reconstruct the exact recipe state at time of order creation — ingredients, steps, quantities, shelf life. A delta/patch approach requires replaying all deltas forward, which adds query complexity and risk of reconstruction errors. A full snapshot is simpler, self-contained, and fast to retrieve. Storage cost is negligible for the expected data volume (hundreds of recipes, thousands of versions).

**Alternatives considered**:
- Delta/event-sourcing: Rejected — unnecessary complexity for the data volume and query pattern.
- Separate versioned child tables: Rejected — creates schema sprawl and complicates the "restore exact version" query pattern.

---

## Decision 2: Optimistic Locking Implementation

**Decision**: Use a `updatedAt` timestamp + `version` integer on the `recipes` table. When opening a recipe for editing, the client captures the current `version` value. On save/publish, the Server Action checks that `recipes.version = captured_version` inside a transaction. If mismatched, the action returns a `CONFLICT` error. The UI displays: "This recipe was modified since you opened it. Please reload before saving."

**Rationale**: Optimistic locking with a version counter is the standard pattern for this use case. It is simple, stateless, and compatible with Prisma's transaction API. No need for distributed locks or explicit session state.

**Alternatives considered**:
- Pessimistic locking (SELECT FOR UPDATE): Rejected — holds DB locks across user think time, creating contention and timeout risk.
- Timestamp-only comparison: Rejected — timestamp precision collisions possible under concurrent load; integer counter is deterministic.

---

## Decision 3: Ingredient Linkage — Inventory Items Only (No Free Text)

**Decision**: `recipe_ingredients.inventory_item_id` is a required foreign key reference to an `inventory_items` table (managed by the Inventory module). Free-text ingredient names are not permitted. The ingredient entry UI renders an inventory item search/select control.

**Rationale**: The user requirement explicitly states ingredients must be linked to inventory items to enable accurate inventory consumption in production orders. Free-text was considered and explicitly rejected in the user's plan input.

**Alternatives considered**:
- Free-text with later mapping: Rejected by product decision.
- Ingredient registry (intermediate table): Unnecessary — inventory_items already serves this role.

---

## Decision 4: Draft Save vs. Publish — Version Trigger

**Decision**: Saving a Draft updates the `recipes` table in place (no new `recipe_versions` row is created). Publishing creates a new `recipe_versions` row with a full JSON snapshot, increments `recipes.published_version`, and sets `recipes.status = ACTIVE`. Version label format: `v{major}.{minor}` where `minor` increments on each publish from ACTIVE→edit→publish, and `major` increments on significant structural changes (manual, admin-only action).

**Simplified**: For v1, every publish increments a monotonic `published_version` integer. Display format: `v1`, `v2`, `v3` etc. Major.minor versioning is deferred to a future enhancement.

**Rationale**: Simpler is better (Constitution I). A monotonic integer version is unambiguous, collision-free, and trivially orderable. Users understand "v1, v2, v3" immediately.

**Alternatives considered**:
- Semantic versioning (v1.0, v1.1, v2.0): Deferred — adds UX complexity without clear operational benefit in v1.
- Timestamp as version: Rejected — not human-readable or naturally orderable in a display context.

---

## Decision 5: Recipe Scope Enforcement Pattern

**Decision**: Recipe scope is stored in `recipe_assignments` (recipe_id, scope_type ENUM, scope_id). Enforcement is implemented at the Server Action / API layer: all recipe list queries for production order selectors apply a scope filter joining against the current user's department_id, production_line_ids, and user_id. Recipes with no assignments are treated as globally accessible (open access default).

**Rationale**: Enforcement at the data-access layer (Server Actions) is simpler and more reliable than UI-layer filtering. The open-access default follows the FR-012 requirement and the principle of least restriction.

**Alternatives considered**:
- Row-Level Security (RLS) in Postgres/Supabase: Viable but complex to maintain alongside Prisma schema. Deferred — can be layered later without breaking the application layer enforcement.
- Middleware-based enforcement: Rejected — middleware cannot perform the per-query join needed for scope filtering.

---

## Decision 6: Audit Log Storage

**Decision**: `recipe_audit_logs` is an append-only table. Prisma writes to it inside the same transaction as the primary operation (e.g., save draft, publish, archive). Columns: `id`, `recipe_id`, `action` (ENUM), `actor_id`, `timestamp`, `prev_value` (JSONB), `new_value` (JSONB). No update or delete operations are ever issued against this table. Application-level enforcement only (no DB-level constraint needed for v1).

**Rationale**: Collocating audit writes in the same transaction as the primary write guarantees consistency — no audit entry is created for a failed operation, and no operation completes without an audit entry. JSONB for prev/new values gives full flexibility without a rigid schema per action type.

**Alternatives considered**:
- Separate audit microservice: Rejected — overkill for the data volume and team size.
- Event queue (e.g., outbox pattern): Deferred — appropriate if audit volume grows to millions of rows.

---

## Decision 7: Bilingual Fields (Arabic + English)

**Decision**: Recipe name is stored as two separate columns: `name_ar` (Arabic) and `name_en` (English). Both are required at publish time; only `name_ar` is required at draft save. This applies to the recipe name only. Other text fields (instructions, notes, description) are stored as single-language strings with no enforced translation requirement.

**Rationale**: The user's plan specifies bilingual recipe names. The constitution specifies Cairo (Arabic) and Inter (English) fonts, confirming bilingual support is a platform-wide requirement. Storing both columns avoids runtime translation dependencies and makes sorting/searching straightforward.

**Alternatives considered**:
- i18n JSON column: Rejected — harder to query and sort by name in SQL.
- Translation table: Rejected — unnecessary complexity for two fixed languages.

---

## Decision 8: Shelf Life and Yield Units — Enum vs. Free Text

**Decision**: Both `shelf_life_unit` and `yield_unit` are stored as PostgreSQL ENUMs (mapped via Prisma). Supported values are defined in the schema and correspond exactly to the user's specification. Adding new units requires a schema migration (acceptable for v1; the set is stable).

**Shelf life units**: `HOURS`, `DAYS`, `WEEKS`, `MONTHS`
**Yield units**: `KG`, `GRAM`, `LITER`, `MILLILITER`, `PIECE`

**Rationale**: ENUMs prevent invalid data entry at the DB level, simplify filtering and display logic, and eliminate free-text validation errors. The defined sets are comprehensive for a restaurant production context.

**Alternatives considered**:
- Free-text unit field: Rejected — creates data inconsistency (e.g., "KG", "kg", "Kilogram").
- Lookup table: Rejected — unnecessary indirection for a small, stable set.

---

## Decision 9: Storage Method — Enum + Notes

**Decision**: `storage_method` is a ENUM: `REFRIGERATOR`, `FREEZER`, `ROOM_TEMPERATURE`, `CUSTOM`. `storage_notes` is an optional free-text field for specific instructions (e.g., "Keep below 4°C"). When method is `CUSTOM`, notes are required.

**Rationale**: Enum for method enables filtering and reporting (e.g., "all recipes requiring refrigeration"). Free-text notes handle the specifics without polluting the enum set.

---

## Decision 10: Search & Filtering Architecture

**Decision**: Recipe list uses server-side filtering via Prisma `where` clauses in Server Actions. The UI sends filter state (name query, category, status, department, production line) as parameters to the Server Action. Pagination is server-side (cursor-based for performance; page-size default 25). Search on `name_ar` and `name_en` uses `contains` (case-insensitive). Full-text search is deferred to a future enhancement.

**Rationale**: Server-side filtering respects the <500ms performance target and scales to thousands of recipes. Client-side filtering of all recipes would violate the constitution's performance standards.

**Alternatives considered**:
- Full-text search (PostgreSQL `tsvector`): Deferred — `ILIKE` `contains` is sufficient for expected data volume (<1000 recipes).
- Algolia/external search: Rejected — unnecessary external dependency for the data volume.
