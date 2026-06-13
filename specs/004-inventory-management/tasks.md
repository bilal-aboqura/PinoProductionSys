# Tasks: Inventory Management & Material Consumption

**Input**: Design documents from `specs/004-inventory-management/`  
**Prerequisites**: [plan.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/plan.md) · [spec.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/spec.md) · [data-model.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/data-model.md) · [contracts/server-actions.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/contracts/server-actions.md) · [research.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/research.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US6)
- Paths follow the project structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema migration and shared inventory feature scaffolding — no user story work can begin until this phase is complete.

- [X] T001 Rename Prisma model `InventoryArea` → `Warehouse` (@@map: `warehouses`) and `UserInventoryArea` → `UserWarehouse` (@@map: `user_warehouses`) in `prisma/schema.prisma`
- [X] T002 Add new Prisma enum `ItemType` (RAW_MATERIAL, FINISHED_PRODUCT) and extend existing `Unit` enum if absent in `prisma/schema.prisma`
- [X] T003 [P] Add Prisma model `InventoryCategory` with fields: id, name, description, timestamps in `prisma/schema.prisma`
- [X] T004 [P] Add Prisma model `InventoryItem` with fields: id, code, nameAr, nameEn, itemType, categoryId, unit, minStockLevel, isActive, timestamps, and relations in `prisma/schema.prisma`
- [X] T005 [P] Add Prisma model `InventoryBalance` with fields: id, warehouseId, inventoryItemId, currentQuantity, reservedQuantity, availableQuantity, timestamps, and unique constraint in `prisma/schema.prisma`
- [X] T006 [P] Add Prisma model `StockMovement` with fields: id, timestamp, userId, warehouseId, inventoryItemId, quantityDelta, movementType (enum MovementType), sourceRefId in `prisma/schema.prisma`
- [X] T007 [P] Add Prisma model `InventoryTransfer` with fields: id, userId, itemId, sourceWhId, destWhId, quantity, timestamp, notes in `prisma/schema.prisma`
- [X] T008 [P] Add Prisma model `InventoryAdjustment` with fields: id, userId, warehouseId, inventoryItemId, quantityDelta, reason (enum AdjustmentReason), notes, timestamp in `prisma/schema.prisma`
- [X] T009 [P] Add Prisma model `InventoryWasteRecord` with fields: id, userId, warehouseId, inventoryItemId, quantity, reason (enum WasteReason), notes, timestamp in `prisma/schema.prisma`
- [X] T010 [P] Add Prisma model `InventoryConsumptionLog` with fields: id, productionOrderId, warehouseId, inventoryItemId, quantityConsumed, timestamp in `prisma/schema.prisma`
- [X] T011 [P] Add Prisma model `InventoryOutputLog` with fields: id, productionOrderId, warehouseId, inventoryItemId, quantityProduced, timestamp in `prisma/schema.prisma`
- [X] T012 [P] Add Prisma model `InventoryAuditLog` with fields: id, timestamp, actorId, action, targetId, previousValue (Json?), newValue (Json?) in `prisma/schema.prisma`
- [X] T013 Generate and apply Prisma migration: `npx prisma migrate dev --name inventory-management-initial`
- [X] T014 Regenerate Prisma client: `npx prisma generate`
- [X] T015 [P] Seed default `InventoryCategory` entries (Dry Goods, Liquids, Dairy, Vegetables, Packaging, Prepped Foods) in `prisma/seed.ts`
- [X] T016 [P] Add inventory permissions to seed data: `inventory:view`, `inventory:manage`, `inventory:adjust`, `inventory:transfer` in `prisma/seed.ts`
- [X] T017 Create feature directory scaffold: `src/features/inventory/` with empty files `actions.ts`, `queries.ts`, `types.ts`, `validation.ts`
- [X] T018 [P] Create shared `ActionResult<T>` type and error code constants in `src/features/inventory/types.ts`
- [X] T019 [P] Implement unit conversion utility `convertUnit(value, from, to)` with weight/volume/piece conversions in `src/features/inventory/lib/unit-converter.ts`
- [X] T020 [P] Implement warehouse-scope guard helper `assertUserWarehouseAccess(userId, warehouseId)` in `src/features/inventory/lib/warehouse-access.ts`

**Checkpoint**: Schema migrated, Prisma client updated, feature directory and shared utilities created — user story work can begin.

---

## Phase 2: Foundational (Shared Query Layer)

**Purpose**: Core shared queries used across multiple user stories — must be in place before phases that depend on them.

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [X] T021 Implement `getWarehouses()` query (all active warehouses) in `src/features/inventory/queries.ts`
- [X] T022 [P] Implement `getInventoryItems()` query (filterable by type, category, isActive) in `src/features/inventory/queries.ts`
- [X] T023 [P] Implement `getInventoryBalance(warehouseId, itemId)` query returning current/reserved/available quantities in `src/features/inventory/queries.ts`
- [X] T024 [P] Implement `getInventoryBalances(filters)` paginated query (filterable by warehouse, search, type, low-stock) in `src/features/inventory/queries.ts`
- [X] T025 [P] Implement `getStockMovementHistory(filters)` paginated query (filterable by item, warehouse, date range, type) in `src/features/inventory/queries.ts`
- [X] T026 [P] Define Zod schemas for all Server Action inputs (CreateItemInput, TransferInput, AdjustmentInput, WasteInput) in `src/features/inventory/validation.ts`

**Checkpoint**: Queries and validation ready — UI and Server Action implementation can begin for all user stories.

---

## Phase 3: User Story 1 — Manage Inventory Item Catalog (Priority: P1) 🎯 MVP

**Goal**: Authorized users can view, create, edit, and deactivate inventory items and warehouse locations.

**Independent Test**: Navigate to the inventory catalog, create a new item with code, names, category, and unit. Verify it appears in the active list, edit it, then deactivate it and verify it no longer appears in active listings but remains in history.

### Implementation

- [X] T027 [P] [US1] Implement `createInventoryItem(input)` Server Action with RBAC (Admin/InventoryManager) and Zod validation in `src/features/inventory/actions.ts`
- [X] T028 [P] [US1] Implement `updateInventoryItem(id, input)` Server Action with RBAC in `src/features/inventory/actions.ts`
- [X] T029 [P] [US1] Implement `deactivateInventoryItem(id)` Server Action with soft-delete check (blocks hard-delete if movements exist) in `src/features/inventory/actions.ts`
- [X] T030 [P] [US1] Implement `createWarehouse(input)` Server Action with unique code/name validation in `src/features/inventory/actions.ts`
- [X] T031 [P] [US1] Implement `deactivateWarehouse(id)` Server Action with soft-delete protection in `src/features/inventory/actions.ts`
- [X] T032 [P] [US1] Implement `createInventoryCategory(input)` and `getInventoryCategories()` in `src/features/inventory/actions.ts`
- [X] T033 [US1] Create inventory catalog list page with filterable shadcn/ui DataTable (columns: code, nameEn, nameAr, type, category, unit, minStock, status) in `src/app/[locale]/(protected)/inventory/items/page.tsx`
- [X] T034 [US1] Create inventory item create/edit drawer or dialog form (fields: code, nameAr, nameEn, itemType, category, unit, minStockLevel) in `src/app/[locale]/(protected)/inventory/items/_components/ItemForm.tsx`
- [X] T035 [US1] Create warehouse management list page with shadcn/ui DataTable (columns: code, name, description, status) in `src/app/[locale]/(protected)/inventory/warehouses/page.tsx`
- [X] T036 [US1] Create warehouse create/edit form dialog (fields: code, name, description) in `src/app/[locale]/(protected)/inventory/warehouses/_components/WarehouseForm.tsx`
- [X] T037 [US1] Add `inventory:manage` permission gate to item and warehouse mutation forms in `src/app/[locale]/(protected)/inventory/items/_components/ItemForm.tsx` and `WarehouseForm.tsx`
- [X] T038 [US1] Write audit log entries for item and warehouse create/update/deactivate in `src/features/inventory/actions.ts`

**Checkpoint**: Catalog management and warehouse setup are fully functional. Items and warehouses can be created, edited, and deactivated with RBAC enforced.

---

## Phase 4: User Story 2 — View Real-Time Stock Levels (Priority: P1)

**Goal**: All authenticated users with inventory access can view current stock levels across all warehouses via a searchable, filterable dashboard.

**Independent Test**: Navigate to `/inventory`. Search for an item name, filter by warehouse, and verify the table shows correct quantities matching the sum of all ledger movements. Verify a Production Staff user can see all warehouses globally without restriction.

### Implementation

- [X] T039 [US2] Create main inventory stock levels dashboard page with header, summary cards (total items, low-stock count, warehouses), and tabbed layout in `src/app/[locale]/(protected)/inventory/page.tsx`
- [X] T040 [US2] Create stock levels DataTable component with columns: item code, nameEn, nameAr, category, warehouse, currentQty, unit, low-stock badge in `src/app/[locale]/(protected)/inventory/_components/StockLevelsTable.tsx`
- [X] T041 [US2] Add search input (by item code/name) with debounced filtering hooked to `getInventoryBalances()` in `src/app/[locale]/(protected)/inventory/_components/StockLevelsTable.tsx`
- [X] T042 [US2] Add warehouse filter dropdown (all warehouses, including those user is not assigned to) for global visibility in `src/app/[locale]/(protected)/inventory/_components/StockFilters.tsx`
- [X] T043 [P] [US2] Add item type filter (Raw Material / Finished Product) and low-stock-only toggle in `src/app/[locale]/(protected)/inventory/_components/StockFilters.tsx`
- [X] T044 [US2] Add low-stock visual indicator: highlight rows where `currentQuantity < minStockLevel` with warning badge and color token in `src/app/[locale]/(protected)/inventory/_components/StockLevelsTable.tsx`
- [X] T045 [US2] Add negative-stock visual indicator: highlight rows where `currentQuantity < 0` with error badge on the dashboard in `src/app/[locale]/(protected)/inventory/_components/StockLevelsTable.tsx`
- [X] T046 [P] [US2] Add server-side pagination to `getInventoryBalances()` query with page size 50 in `src/features/inventory/queries.ts`
- [X] T047 [US2] Add inventory navigation links to the app sidebar (Inventory, Catalog, Warehouses, History) in `src/components/layout/AppNav.tsx`

**Checkpoint**: The stock dashboard is functional, globally visible, searchable, filterable, and correctly highlights low-stock and negative-stock items.

---

## Phase 5: User Story 3 — Automatic Production Consumption & Receipt (Priority: P1)

**Goal**: When a production order is completed, the system automatically deducts raw materials (using production ratio formula) and adds finished product output to designated warehouses.

**Independent Test**: Complete a production order for a recipe with known ingredients and yield. Verify raw material stock decreases by the calculated amount (recipe_qty × actual_qty / recipe_yield) and finished product stock increases. Verify both appear in the movement ledger linked to the production order ID.

### Implementation

- [X] T048 [US3] Implement `consumeInventoryForProduction(productionOrderId, tx)` internal service that: (1) loads recipe version snapshot, (2) calculates consumed qty per ingredient using production ratio, (3) converts units via `convertUnit()`, (4) deducts from source warehouse balance using row-level locking, (5) posts `PRODUCTION_CONSUMPTION` StockMovement entries in `src/features/inventory/lib/production-consumption.ts`
- [X] T049 [US3] Implement negative stock handling inside `consumeInventoryForProduction`: allow deduction to proceed even if balance < 0, log a negative stock event in `InventoryAuditLog`, and mark the `InventoryBalance` row with a `needsReconciliation` flag in `src/features/inventory/lib/production-consumption.ts`
- [X] T050 [US3] Implement `addProductionOutput(productionOrderId, warehouseId, itemId, qty, tx)` internal service that increases finished goods balance and posts a `PRODUCTION_OUTPUT` StockMovement entry in `src/features/inventory/lib/production-output.ts`
- [X] T051 [US3] Update `InventoryBalance` model in schema to add `needsReconciliation Boolean @default(false)` flag in `prisma/schema.prisma` and regenerate migration
- [X] T052 [US3] Expose `completeProductionOrderInventory(productionOrderId, outputWarehouseId, finishedItemId, producedQty)` Server Action (to be called from production-orders feature on completion) in `src/features/inventory/actions.ts`
- [X] T053 [US3] Add pre-completion warning dialog to production order UI: if any ingredient would go negative, display a list of affected items with a "Confirm with Warning" button (this task coordinates with the production-orders feature) in `src/features/inventory/lib/production-consumption.ts` (return warning payload) and document the expected integration contract
- [X] T054 [US3] Write `InventoryConsumptionLog` and `InventoryOutputLog` entries inside the production completion transaction in `src/features/inventory/lib/production-consumption.ts` and `production-output.ts`

**Checkpoint**: Production completion automatically triggers inventory deductions and additions. Negative stock is logged and flagged. All movements are linked to the production order.

---

## Phase 6: User Story 4 — Transfer Inventory Between Warehouses (Priority: P2)

**Goal**: Authorized users can move stock from one warehouse to another. Transfers are blocked if the source has insufficient stock. Users can only initiate transfers from their assigned warehouses.

**Independent Test**: Transfer 20 KG flour from WH-MAIN to WH-LK1. Verify WH-MAIN decreases and WH-LK1 increases by 20. Verify two ledger entries (TRANSFER_OUT, TRANSFER_IN) link to the same transfer record. Attempt the same transfer as a user not assigned to WH-MAIN — expect rejection.

### Implementation

- [X] T055 [P] [US4] Implement `transferInventory(input)` Server Action with: warehouse-scope guard (`assertUserWarehouseAccess`), sufficient-stock check (block if `availableQuantity < qty`), atomic dual-balance update with row locking, dual `StockMovement` entries (TRANSFER_OUT + TRANSFER_IN), and `InventoryTransfer` record creation in `src/features/inventory/actions.ts`
- [X] T056 [US4] Create Warehouse Transfer form page with item selector, source/destination warehouse dropdowns, quantity input, notes field, and confirmation step showing current source stock in `src/app/[locale]/(protected)/inventory/transfers/page.tsx`
- [X] T057 [US4] Create transfer history DataTable (columns: date, user, item, from-warehouse, to-warehouse, quantity) in `src/app/[locale]/(protected)/inventory/transfers/_components/TransferHistoryTable.tsx`
- [X] T058 [US4] Filter source warehouse dropdown to only show warehouses the current user is assigned to (non-admins); admins see all in `src/app/[locale]/(protected)/inventory/transfers/page.tsx`
- [X] T059 [US4] Display real-time available stock for the selected source warehouse + item alongside the quantity input field in `src/app/[locale]/(protected)/inventory/transfers/page.tsx`
- [X] T060 [US4] Show inline error when transfer is blocked due to insufficient stock (`INSUFFICIENT_STOCK` error code) in `src/app/[locale]/(protected)/inventory/transfers/page.tsx`

**Checkpoint**: Warehouse transfers are atomic, enforced for warehouse scope, blocked when stock is insufficient, and fully logged.

---

## Phase 7: User Story 5 — Record Manual Adjustments (Priority: P2)

**Goal**: Authorized users can manually increase or decrease inventory to reconcile discrepancies. Decrements that would result in negative stock are blocked. A mandatory reason is required.

**Independent Test**: Record +100 KG flour adjustment (reason: INVENTORY_RECONCILIATION). Verify stock increases. Then attempt -150 KG (which exceeds current stock) — expect block. Record -5 KG spoilage — verify decrease and ledger entry with reason.

### Implementation

- [X] T061 [P] [US5] Implement `recordManualAdjustment(input)` Server Action with: warehouse-scope guard, negative-stock block (`ADJUSTMENT_BLOCKED_NEGATIVE_STOCK`), balance update, `StockMovement` entry (ADJUSTMENT_INCREASE or ADJUSTMENT_DECREASE), and `InventoryAdjustment` record in `src/features/inventory/actions.ts`
- [X] T062 [US5] Create manual adjustment form page with item selector, warehouse selector (scoped to user's assignments), quantity input (with +/− toggle or signed value), reason dropdown (STOCK_COUNT_CORRECTION, DAMAGED_GOODS, INVENTORY_RECONCILIATION, LOST_MATERIALS), and notes textarea in `src/app/[locale]/(protected)/inventory/adjustments/page.tsx`
- [X] T063 [US5] Display current stock level for the selected item+warehouse combination inline with the quantity input in `src/app/[locale]/(protected)/inventory/adjustments/page.tsx`
- [X] T064 [US5] Show inline validation error when adjustment would result in negative stock, with message instructing user to use a stock correction instead in `src/app/[locale]/(protected)/inventory/adjustments/page.tsx`
- [X] T065 [US5] Create adjustment history DataTable (columns: date, user, item, warehouse, delta, reason, notes) in `src/app/[locale]/(protected)/inventory/adjustments/_components/AdjustmentHistoryTable.tsx`

**Checkpoint**: Manual adjustments work correctly, negative stock is blocked with a clear message, and all entries are logged with mandatory reason.

---

## Phase 8: User Story 6 — Inventory History & Traceability Ledger (Priority: P2)

**Goal**: Users can view a chronological, fully filterable audit ledger of every stock movement, with clickable links to source transactions.

**Independent Test**: Complete a production order, perform a transfer, and record an adjustment. Navigate to inventory history, filter by item and verify all three events appear with correct timestamps, users, quantity deltas, movement types, and clickable source links.

### Implementation

- [X] T066 [P] [US6] Implement `getInventoryMovementHistory(filters)` paginated Server Action with filters: inventoryItemId, warehouseId, movementType, dateFrom, dateTo — returning MovementDto with sourceRefId and resolved source type in `src/features/inventory/queries.ts`
- [X] T067 [US6] Create movement history page with full-width DataTable (columns: timestamp, user, item, warehouse, delta+unit, movementType badge, source link) in `src/app/[locale]/(protected)/inventory/history/page.tsx`
- [X] T068 [US6] Add filter panel: item search, warehouse dropdown, movement type multi-select, date range pickers in `src/app/[locale]/(protected)/inventory/history/_components/MovementFilters.tsx`
- [X] T069 [US6] Implement source link resolver: given `sourceRefId` and `movementType`, render a clickable link to the appropriate detail page (Production Order, Transfer record, or Adjustment record) in `src/app/[locale]/(protected)/inventory/history/_components/SourceLink.tsx`
- [X] T070 [US6] Add server-side pagination (50 rows/page) with total count to movement history query in `src/features/inventory/queries.ts`
- [X] T071 [US6] Add `needsReconciliation` filter toggle on the stock dashboard to surface only flagged negative-stock items in `src/app/[locale]/(protected)/inventory/_components/StockFilters.tsx`

**Checkpoint**: Full inventory ledger is browsable, filterable, and every entry links back to its originating transaction.

---

## Phase 9: Waste Recording

**Goal**: Authorized users can log ingredient waste or spoilage as a separate, auditable event (distinct from production consumption or manual adjustments).

**Independent Test**: Record 1.5 KG spoilage of flour from WH-LK1 with reason SPOILAGE. Verify balance decreases by 1.5 KG. Verify a WASTE movement appears in the ledger. Verify a WasteRecord exists with the user, timestamp, and reason.

### Implementation

- [X] T072 [P] Implement `recordInventoryWaste(input)` Server Action with warehouse-scope guard, balance deduction, `StockMovement` entry (WASTE type), and `InventoryWasteRecord` creation in `src/features/inventory/actions.ts`
- [X] T073 Implement waste recording Zod schema (warehouseId, inventoryItemId, quantity > 0, reason, notes?) in `src/features/inventory/validation.ts`
- [X] T074 Create waste recording form page with item selector, warehouse selector (scoped), quantity input, reason dropdown (BURNED_BATCH, SPOILAGE, PRODUCTION_LOSS, DAMAGED_MATERIAL), notes textarea in `src/app/[locale]/(protected)/inventory/waste/page.tsx`
- [X] T075 Create waste history DataTable (columns: date, user, item, warehouse, quantity, reason, notes) in `src/app/[locale]/(protected)/inventory/waste/_components/WasteHistoryTable.tsx`

**Checkpoint**: Waste is tracked separately from adjustments and production consumption, preserving recipe consumption accuracy.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Low-stock monitoring, error handling refinement, performance indexes, and nav wiring.

- [X] T076 [P] Add database indexes for `inventory_balances(warehouseId, inventoryItemId)`, `inventory_movements(timestamp)`, `inventory_movements(warehouseId, inventoryItemId)`, `inventory_items(code)` in `prisma/schema.prisma` migration
- [X] T077 [P] Add low-stock alert banner/section to main inventory dashboard: a count badge in the nav and a collapsible alert listing items below minimum stock in `src/app/[locale]/(protected)/inventory/page.tsx`
- [X] T078 [P] Add inventory discrepancy report section to dashboard: list all items with `needsReconciliation = true` grouped by warehouse in `src/app/[locale]/(protected)/inventory/_components/DiscrepancyReport.tsx`
- [X] T079 [P] Implement `getUserWarehouseAssignments(userId)` query for use in all action-scoping checks in `src/features/inventory/queries.ts`
- [X] T080 [P] Add inventory sidebar navigation entries and breadcrumb component shared across all inventory pages in `src/components/layout/AppNav.tsx` and `src/app/[locale]/(protected)/inventory/_components/InventoryBreadcrumb.tsx`
- [X] T081 [P] Add consistent empty-state components for all DataTables (zero items, no search results) following design system in `src/app/[locale]/(protected)/inventory/_components/EmptyState.tsx`
- [X] T082 Run all 9 quickstart validation scenarios from [quickstart.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/quickstart.md) and document results
- [X] T083 [P] Review all Server Action error messages for clarity and consistency against the error codes defined in [contracts/server-actions.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/contracts/server-actions.md)
- [X] T084 [P] Verify all inventory pages are responsive and usable at tablet breakpoint (1024px) per constitution Principle V

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. All T001–T020 tasks can be parallelized.
- **Foundational (Phase 2)**: Depends on Phase 1 completion. T021–T026 can be parallelized.
- **User Story Phases (3–9)**: All depend on Phase 2. US1 (Phase 3) and US2 (Phase 4) are fully independent and can start together after Phase 2.
- **Polish (Phase 10)**: Depends on all desired user stories being complete.

### User Story Dependencies

| Story | Phase | Depends On | Can Parallelize With |
|-------|-------|-----------|----------------------|
| US1 — Catalog Mgmt | 3 | Phase 2 | US2 |
| US2 — Stock Levels | 4 | Phase 2 | US1 |
| US3 — Production Consumption | 5 | Phase 2, US1 | US4, US5 |
| US4 — Transfers | 6 | Phase 2, US1 | US3, US5 |
| US5 — Adjustments | 7 | Phase 2, US1 | US3, US4 |
| US6 — History Ledger | 8 | Phase 2 | All above |
| Waste Recording | 9 | Phase 2, US1 | US6 |

### Parallel Opportunities within Phase 1 (Setup)

```
Parallel Group A (schema models — all independent):
  T003, T004, T005, T006, T007, T008, T009, T010, T011, T012

Sequential after Group A:
  T013 (migrate) → T014 (generate client)

Parallel Group B (scaffolding — independent of migration):
  T015, T016, T017, T018, T019, T020
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (schema + scaffolding)
2. Complete Phase 2: Foundational (queries + validation)
3. Complete Phase 3: US1 — Catalog Management
4. Complete Phase 4: US2 — Stock Levels Dashboard
5. **STOP and VALIDATE**: Items and stock are visible and manageable — deliver this as the inventory MVP.

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 + US2 → Catalog and Stock Visibility (MVP)
3. US3 → Production Auto-Consumption (high-value integration)
4. US4 + US5 → Transfers and Adjustments (operational transactions)
5. US6 → Full Traceability Ledger
6. Waste Recording + Polish → Complete module

### Parallel Team Strategy

With 2+ developers after Phase 2 completion:
- **Developer A**: US1 (Catalog) → US3 (Production Consumption)
- **Developer B**: US2 (Dashboard) → US4 (Transfers) → US5 (Adjustments)

---

## Notes

- [P] tasks have no file conflicts and can be executed concurrently
- All stock balance updates MUST use Prisma transactions with row-level locking (research Decision 1)
- Unit conversions MUST go through `convertUnit()` — never inline conversion arithmetic
- `assertUserWarehouseAccess()` MUST be called at the top of every mutation Server Action before any DB operations
- Soft-delete is enforced everywhere — no hard-delete of items, warehouses, or movement records
- Refer to [quickstart.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/quickstart.md) Scenario 9 for the production completion integration test
