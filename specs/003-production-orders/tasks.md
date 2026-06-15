# Tasks: Production Orders

**Input**: Design documents from `specs/003-production-orders/`  
**Prerequisites**: [plan.md](./plan.md) ✅ | [spec.md](./spec.md) ✅ | [research.md](./research.md) ✅ | [data-model.md](./data-model.md) ✅ | [contracts/](./contracts/) ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All paths are relative to `src/` unless prefixed with `prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, permission constants, and feature folder scaffolding — zero application logic.

- [X] T001 Extend `prisma/schema.prisma` — add `ProductionOrderStatus` enum, `ProductionOrder`, `ProductionOrderStep`, `ProductionOrderStepPhoto`, `ProductionOrderStepNote`, `ProductionOrderStatusHistory` models, and new `AuditAction` values per `data-model.md`
- [X] T002 Run `npx prisma migrate dev --name production_orders` and verify migration applies cleanly
- [X] T003 [P] Create `src/features/production-orders/` directory with empty `actions.ts`, `queries.ts`, `types.ts` files and `lib/` subdirectory
- [X] T004 [P] Create `src/features/production-orders/lib/permissions.ts` — export all `production-orders:*` permission constants and `ProductionOrderPermissionKey` union type (mirrors pattern in `src/lib/permissions.ts`)
- [X] T005 [P] Create `src/features/production-orders/lib/status.ts` — implement `assertValidTransition(from, to)` pure guard function covering all valid/invalid status transitions per `data-model.md` state diagram
- [X] T006 [P] Create `src/features/production-orders/lib/audit.ts` — implement `writeProductionAuditLog` helper wrapping the existing `AuditLog` model, mirroring `src/lib/recipes/audit.ts` pattern
- [X] T007 [P] Create `src/features/production-orders/types.ts` — define all DTOs: `ProductionOrderListItemDto`, `ProductionOrderDetailDto`, `ProductionOrderStepDto`, `ProductionOrderStepPhotoDto`, `ProductionOrderStepNoteDto`, `OrderQueueItemDto`
- [X] T008 [P] Seed new permission codes (`production-orders:view`, `create`, `assign`, `claim`, `execute`, `complete`, `cancel`, `view_all`) into the `permissions` table via updated `prisma/seed.ts`
- [X] T009 Create `src/components/production-orders/` directory with empty index barrel file

**Checkpoint**: Schema migrated, permissions seeded, all empty stubs in place. No application logic yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities and order-number generation that all user story phases depend on.

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Create `src/lib/production-orders/order-number.ts` — implement `generateOrderNumber()` that queries `MAX` order number for today's date prefix (`PO-YYYYMMDD-`) and returns next padded number (e.g. `PO-20260613-0001`); pure function + DB query helper
- [X] T011 Create `src/lib/production-orders/step-seeder.ts` — implement `seedStepsFromSnapshot(tx, orderId, snapshot)` that creates one `ProductionOrderStep` row per step in the `RecipeVersion.snapshot.steps` array, copying `stepNumber`, `title`, `instructions`, `estimatedMinutes`, `requiresPhoto`, `requiresNotes`; also sets `requiresQuantity` from snapshot if present
- [X] T012 Create `src/lib/production-orders/completion-check.ts` — implement `validateStepCompletable(tx, step)` checking photo, note, and quantity requirements; returns `{ valid: boolean; missing: string[] }`
- [X] T013 [P] Create `src/features/production-orders/queries.ts` — implement `getProductionOrderList`, `getUnassignedQueue`, `getProductionOrderDetail`, `getMyProductionOrders`, `getStepPhotoUrl` using Prisma reads and `getServerSession` auth guard; no mutations

**Checkpoint**: Shared utilities ready. All foundational helpers unit-testable independently.

---

## Phase 3: User Story 1 — Create Production Order from Recipe (Priority: P1) 🎯 MVP

**Goal**: Authorized users can create a production order from an active recipe version, with optional pre-assignment or leaving it unassigned.

**Independent Test**: Create an order as supervisor (pre-assigned and unassigned), verify `orderNumber` format, recipe version lock, and correct initial status. See quickstart.md Scenario 1 steps 1–9.

### Implementation

- [X] T014 [US1] Implement `createProductionOrder` Server Action in `src/features/production-orders/actions.ts`:
  - `getServerSession` + `requirePermission(production-orders:create)`
  - Category-scope check via `UserRecipeCategory` for staff roles
  - Validate `recipeVersionId` resolves to an ACTIVE recipe
  - Call `generateOrderNumber()` (T010)
  - Create `ProductionOrder` row with `PENDING_UNASSIGNED` or `PENDING` status
  - Call `seedStepsFromSnapshot()` (T011) inside `prisma.$transaction`
  - Write `ProductionOrderStatusHistory` entry
  - Call `writeProductionAuditLog` (`PRODUCTION_ORDER_CREATED`)
  - Revalidate `/[locale]/production` and `/[locale]/production/queue`
- [X] T015 [US1] Implement `assignProductionOrder` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:assign`, status must be `PENDING_UNASSIGNED`
  - Validate target user has `production-orders:execute`
  - Update `assignedToId`, transition to `PENDING`, increment `version`
  - Write status history + audit log (`PRODUCTION_ORDER_ASSIGNED`)
- [X] T016 [P] [US1] Create `src/app/[locale]/(protected)/production/new/page.tsx` — Server Component page for "Create Order" form:
  - Fetch active recipe list (filtered by user's category scope via `queries.ts`)
  - Fetch eligible staff list for assignment selector
  - Render `CreateOrderForm` client component
- [X] T017 [P] [US1] Create `src/components/production-orders/CreateOrderForm.tsx` — client component with:
  - Recipe version selector (filtered list from server)
  - Target quantity field (unit displayed from selected recipe)
  - Optional assignee selector (search/select staff)
  - Creation notes textarea
  - Submit calls `createProductionOrder` Server Action; shows toast on success/error
- [X] T018 [US1] Create `src/app/[locale]/(protected)/production/page.tsx` — Server Component order list page:
  - Calls `getProductionOrderList` with filters (status, recipe, date range, assigned user)
  - Renders `OrderListTable` with columns: Order #, Recipe, Status, Assigned To, Created At, Actions
  - Paginated (server-side cursor pagination)
- [X] T019 [P] [US1] Create `src/components/production-orders/OrderListTable.tsx` — dense sortable table matching existing table design system
- [X] T020 [P] [US1] Create `src/components/production-orders/OrderStatusBadge.tsx` — status badge component with correct design-system colors for each of the 5 statuses

**Checkpoint**: Supervisors can create orders (assigned and unassigned); order list renders; order number generated correctly; recipe version locked.

---

## Phase 4: User Story 2 — Execute Production Steps in Order (Priority: P1)

**Goal**: Assigned staff are guided through recipe workflow steps in strict sequence; photo, note, and quantity requirements are enforced per step; "Start Production" and auto-start both work.

**Independent Test**: Open an assigned order, attempt to skip/reorder steps (blocked), complete steps with valid evidence, verify auto-start on first step. See quickstart.md Scenarios 3 and 6.

### Implementation

- [X] T021 [US2] Implement `startProductionOrder` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:execute`; acting user must be `assignedToId`
  - Status must be `PENDING`; call `assertValidTransition(PENDING, IN_PROGRESS)`
  - Set `startedAt = now()`, transition status, increment `version`
  - Write status history + audit log (`PRODUCTION_ORDER_STARTED`)
- [X] T022 [US2] Implement `completeStep` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:execute`; acting user must be `assignedToId`
  - Order must be `PENDING` or `IN_PROGRESS`
  - Enforce step sequencing: query lowest-numbered incomplete step; reject if `stepId` doesn't match
  - Call `validateStepCompletable(tx, step)` (T012); return error if missing evidence
  - Auto-start: if order is `PENDING`, set `startedAt`, transition to `IN_PROGRESS`, write history + audit log (`PRODUCTION_ORDER_STARTED`), set `autoStarted = true` in response
  - Mark step complete: set `isCompleted`, `completedAt`, `completedById`, `confirmedQuantity`/`confirmedUnit` if applicable
  - Write audit log (`PRODUCTION_ORDER_STEP_COMPLETED`); increment `version`
- [X] T023 [US2] Create photo upload Route Handler at `src/app/api/production-orders/[id]/steps/[stepId]/photo/route.ts`:
  - Parse `multipart/form-data`; validate MIME type and 10 MB size limit
  - Auth + `production-orders:execute` permission + `assignedToId` check
  - Upload to Supabase Storage `production-evidence` bucket at path `orders/{orderId}/steps/{stepId}/{ts}-{uuid}.{ext}`
  - Create `ProductionOrderStepPhoto` row with `storagePath`
  - Write audit log (`PRODUCTION_ORDER_PHOTO_UPLOADED`)
  - Return `{ success: true, data: { id, storagePath } }`
- [X] T024 [US2] Implement `addStepNote` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:execute`; acting user must be `assignedToId`
  - Order must be `PENDING` or `IN_PROGRESS`
  - Validate content 1–2000 chars
  - Create `ProductionOrderStepNote`; write audit log (`PRODUCTION_ORDER_NOTE_ADDED`)
- [X] T025 [US2] Create `src/app/[locale]/(protected)/production/queue/page.tsx` — unassigned queue page:
  - Calls `getUnassignedQueue()`
  - Renders list of unassigned orders with recipe name, category, creation time, "Claim" button
- [X] T026 [US2] Implement `claimProductionOrder` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:claim`; check user's category matches order's recipe category
  - Order must be `PENDING_UNASSIGNED`; optimistic lock on `version`
  - Set `assignedToId`, `claimedById`; transition to `PENDING`; increment `version`
  - Write status history + audit log (`PRODUCTION_ORDER_CLAIMED`)
- [X] T027 [US2] Create `src/app/[locale]/(protected)/production/[id]/page.tsx` — order detail/execution page (Server Component):
  - Calls `getProductionOrderDetail(id)`; redirects if not found
  - Renders `OrderDetailHeader` + step list (`StepExecutionCard` per step)
  - Shows "Start Production" button if status is `PENDING` and user is `assignedToId`
- [X] T028 [P] [US2] Create `src/components/production-orders/OrderDetailHeader.tsx` — displays order number, recipe name, status badge, assignee, timestamps, target quantity
- [X] T029 [P] [US2] Create `src/components/production-orders/StepExecutionCard.tsx` — single step card showing:
  - Step number, title, instructions, estimated duration
  - Evidence requirements badges (Photo required, Notes required, Qty required)
  - Locked state (grayed) for future steps
  - Completed state with evidence summary for past steps
  - Active state with all input controls for the current step
- [X] T030 [P] [US2] Create `src/components/production-orders/StepPhotoUploader.tsx` — handles camera/file input, calls photo upload Route Handler (T023), shows upload progress, displays thumbnails of uploaded photos
- [X] T031 [P] [US2] Create `src/components/production-orders/StepNotesInput.tsx` — textarea for step note; calls `addStepNote` action on submit; shows saved notes list below input
- [X] T032 [P] [US2] Create `src/components/production-orders/StepQuantityConfirm.tsx` — numeric input for step-level quantity confirmation; unit label from recipe snapshot; calls `completeStep` with `confirmedQuantity`
- [X] T033 [P] [US2] Create `src/components/production-orders/StartProductionButton.tsx` — prominent button shown on `PENDING` orders; calls `startProductionOrder`; shows loading/success/error states
- [X] T034 [US2] Add navigation entry for `/production` in `src/components/layout/AppNav.tsx` and ensure route is protected by existing auth middleware

**Checkpoint**: Staff can claim, start, and execute all steps; photo upload works; note saving works; step sequencing is enforced server-side; auto-start fires on first step completion.

---

## Phase 5: User Story 3 — Record Production Completion Data (Priority: P2)

**Goal**: When all steps are done, staff enter produced quantity and complete the order; system records start/end/duration and all traceability fields automatically.

**Independent Test**: Complete a full order; verify `producedQuantity`, `startedAt`, `completedAt`, `durationSeconds`, `completedById`, and all step evidence are present in the DB row. See quickstart.md Scenario 1 steps 17–20.

### Implementation

- [X] T035 [US3] Implement `completeProductionOrder` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:complete`; acting user must be `assignedToId`
  - Order must be `IN_PROGRESS`
  - Count incomplete steps; reject if any `isCompleted = false`
  - Validate `producedQuantity > 0`
  - Set `producedQuantity`, `completedAt = now()`, `completedById`
  - Calculate `durationSeconds = (completedAt - startedAt)` in seconds
  - Transition status to `COMPLETED`; increment `version`
  - Write status history + audit log (`PRODUCTION_ORDER_COMPLETED`)
  - Revalidate order detail path
- [X] T036 [P] [US3] Create `src/components/production-orders/CompleteOrderButton.tsx` — shown when order is `IN_PROGRESS` and all steps are completed:
  - Renders produced quantity input field (numeric, with recipe unit label)
  - Warns if `producedQuantity` deviates > 20% from `targetQuantity`
  - Calls `completeProductionOrder`; shows success confirmation with order summary
- [X] T037 [US3] Wire `CompleteOrderButton` into `src/app/[locale]/(protected)/production/[id]/page.tsx` — conditionally rendered when all `ProductionOrderStep.isCompleted = true`

**Checkpoint**: Completed orders have full traceability data; quantity deviation warning shown; `COMPLETED` status is immutable.

---

## Phase 6: User Story 4 — Review and Trace Completed Production Orders (Priority: P2)

**Goal**: Supervisors can view the full history of any production order, including all step evidence, the locked recipe version, staff identity, and timestamps.

**Independent Test**: Open a completed order as supervisor; verify all sections render with correct data; verify staff-only view is restricted. See quickstart.md Scenario 7 (RBAC part).

### Implementation

- [X] T038 [US4] Extend `src/app/[locale]/(protected)/production/[id]/page.tsx` — add read-only "History View" rendering for `COMPLETED` and `CANCELLED` orders:
  - Shows all steps with evidence (photos as thumbnails using presigned URLs, notes text)
  - Shows status history timeline
  - Shows produced quantity, duration, all traceability fields
  - No action buttons (immutable)
- [X] T039 [P] [US4] Create `src/components/production-orders/StepEvidenceSummary.tsx` — read-only component showing step photos (thumbnails via presigned URL), notes, and confirmed quantity for a completed step
- [X] T040 [P] [US4] Create `src/components/production-orders/StatusHistoryTimeline.tsx` — vertical timeline of all `ProductionOrderStatusHistory` entries with actor, timestamp, and reason
- [ ] T041 [US4] Add filtering controls to `src/app/[locale]/(protected)/production/page.tsx`:
  - Order number search
  - Status filter (multi-select)
  - Recipe/category filter
  - Assigned user filter
  - Date range picker (createdAt)
  - Sort by: Created Date, Start Date, Completion Date, Status
- [X] T042 [US4] Enforce visibility scoping in `src/features/production-orders/queries.ts`:
  - Users with `production-orders:view_all`: see all orders
  - Users with only `production-orders:view`: see only orders where `assignedToId = session.user.id`

**Checkpoint**: Supervisors see all orders with full evidence; staff see only their assigned orders; list filtering and sorting work.

---

## Phase 7: User Story 5 — Downstream Processing from Completed Orders (Priority: P3)

**Goal**: Completed orders expose action triggers for inventory consumption, batch creation, and label printing, each traceable back to the source production order.

**Independent Test**: From a completed order detail page, verify the downstream action buttons appear; trigger each action and confirm the resulting record references the production order ID. See quickstart.md Scenario 1 steps 17–20 (downstream).

### Implementation

- [X] T043 [P] [US5] Add `src/features/production-orders/actions.ts` — stub action `triggerInventoryConsumption(orderId)`:
  - Require `production-orders:complete` permission
  - Order must be `COMPLETED`
  - Create an inventory consumption record linked to `orderId` (uses existing inventory feature's DB table; implement as a thin record creation — full inventory logic is that feature's concern)
  - Write audit log entry
- [X] T044 [P] [US5] Add stub action `createBatchRecord(orderId)` in `src/features/production-orders/actions.ts`:
  - Require `production-orders:complete` permission
  - Order must be `COMPLETED`
  - Create a batch record referencing `orderId` and `recipeVersionId`
  - Write audit log entry
- [X] T045 [P] [US5] Add stub action `triggerLabelPrint(orderId)` in `src/features/production-orders/actions.ts`:
  - Require `production-orders:complete` permission
  - Order must be `COMPLETED`
  - Record a label print event with `orderId`, `producedQuantity`, `yieldUnit`, `completedAt`
  - Write audit log entry
- [X] T046 [US5] Create `src/components/production-orders/DownstreamActionsPanel.tsx` — panel shown on `COMPLETED` order detail page:
  - Three action buttons: "Record Inventory Consumption", "Create Batch Record", "Print Label"
  - Each button shows loading/success/error state
  - Shows confirmation when action has already been triggered (idempotent display)
- [X] T047 [US5] Wire `DownstreamActionsPanel` into `src/app/[locale]/(protected)/production/[id]/page.tsx` — visible only for `COMPLETED` orders

**Checkpoint**: All three downstream actions can be triggered from a completed order; each creates a linked record with the production order ID.

---

## Phase 8: Cancellation

**Goal**: Supervisors can cancel orders at any non-terminal stage; cancellation is irreversible; all evidence is preserved.

- [X] T048 [US4] Implement `cancelProductionOrder` Server Action in `src/features/production-orders/actions.ts`:
  - Require `production-orders:cancel`
  - Order must be `PENDING_UNASSIGNED`, `PENDING`, or `IN_PROGRESS`; call `assertValidTransition`
  - `cancellationReason` must be non-empty (min 10 chars)
  - Set `cancelledById`, `cancellationReason`, `cancelledAt`; transition to `CANCELLED`; increment `version`
  - Do NOT delete photos, notes, or step records
  - Write status history (with reason) + audit log (`PRODUCTION_ORDER_CANCELLED`)
- [X] T049 [US4] Create `src/app/[locale]/(protected)/production/[id]/cancel/page.tsx` — cancellation confirmation page:
  - Shows order summary
  - Cancellation reason textarea (required, min 10 chars)
  - Confirm/abort buttons
  - Redirects to order detail after success
- [X] T050 [P] [US4] Create `src/components/production-orders/CancelOrderDialog.tsx` — confirmation dialog component used from order detail page; calls `cancelProductionOrder`; shows irreversibility warning

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: UX polish, performance hardening, responsive layout, error states, and final validation.

- [ ] T051 [P] Verify all production order pages are responsive at desktop (1280px), tablet (768px), and mobile (430px) breakpoints; fix any layout issues in `src/app/[locale]/(protected)/production/`
- [X] T052 [P] Add empty state components for: no orders in list, no orders in queue, no steps in order (should never occur but defensive), no photos uploaded yet
- [ ] T053 [P] Add loading skeleton components for order list, queue, and order detail pages
- [ ] T054 [P] Implement optimistic UI feedback for `completeStep` action — immediately mark step visually complete before server round-trip; revert on error
- [ ] T055 [P] Add toast notifications (success/error) for all mutating actions using the existing toast pattern in the codebase
- [X] T056 [P] Add `production-orders:view` and `production-orders:view_all` checks to `src/components/layout/AppNav.tsx` navigation item — hide nav link if user has neither permission
- [X] T057 Verify all Server Actions return correctly typed `ActionResult<T>` matching `src/lib/types/action-result.ts`; fix any type drift
- [X] T058 [P] Add `AUDIT_ACTION_LABELS` entries for all 10 new `PRODUCTION_ORDER_*` actions in `src/features/audit/types.ts`
- [ ] T059 Run quickstart.md validation scenarios 1–7 end-to-end; document any gaps
- [ ] T060 [P] Performance check: measure order list load (target ≤ 500 ms) and step complete action (target ≤ 300 ms) using browser DevTools; add any missing DB indexes identified during testing

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)       → No dependencies — start immediately
Phase 2 (Foundational) → Requires Phase 1 complete — BLOCKS all user story phases
Phase 3 (US1 Create)  → Requires Phase 2 complete
Phase 4 (US2 Execute) → Requires Phase 3 complete (needs OrderDetailHeader, status transitions)
Phase 5 (US3 Complete)→ Requires Phase 4 complete (needs IN_PROGRESS state)
Phase 6 (US4 Trace)   → Requires Phase 5 complete (needs COMPLETED orders to trace)
Phase 7 (US5 Downstream) → Requires Phase 6 complete (needs COMPLETED status enforced)
Phase 8 (Cancellation) → Requires Phase 3 complete; can run parallel to Phases 5–7
Phase 9 (Polish)      → Requires Phases 3–8 complete
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|---|---|---|
| US1 — Create Order | Phase 2 (Foundational) | — |
| US2 — Execute Steps | US1 (needs order to exist + detail page scaffold) | — |
| US3 — Complete | US2 (needs IN_PROGRESS state) | US4 Cancellation |
| US4 — Trace/Cancel | US1 (needs order list/detail base) | US3 Complete |
| US5 — Downstream | US3 (needs COMPLETED orders) | — |

### Parallel Opportunities Within Phases

**Phase 1**: T003–T009 all parallel after T001+T002  
**Phase 2**: T013 parallel to T010–T012  
**Phase 3**: T016, T017, T019, T020 parallel after T014+T015  
**Phase 4**: T028–T034 parallel after T021–T027  
**Phase 5**: T036 parallel to T035  
**Phase 6**: T039–T042 parallel per concern  
**Phase 7**: T043–T046 parallel  
**Phase 9**: All [P]-marked tasks parallel

---

## Parallel Example: Phase 4 (Execute Steps)

```
# After T021-T027 are done, launch in parallel:
Task T028: Create OrderDetailHeader.tsx
Task T029: Create StepExecutionCard.tsx
Task T030: Create StepPhotoUploader.tsx
Task T031: Create StepNotesInput.tsx
Task T032: Create StepQuantityConfirm.tsx
Task T033: Create StartProductionButton.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete **Phase 1**: Setup (T001–T009)
2. Complete **Phase 2**: Foundational (T010–T013)
3. Complete **Phase 3**: Create Production Order (T014–T020)
4. Complete **Phase 4**: Execute Steps (T021–T034)
5. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–3 — creation, queue claim, step sequencing
6. Demo: supervisors can create orders; staff can claim and execute steps through completion

### Incremental Delivery

| Milestone | Phases Complete | What's Deliverable |
|---|---|---|
| M1 — MVP | 1, 2, 3, 4 | Create orders, assign, claim, execute steps, photo upload |
| M2 — Completion | +5 | Full production run from start to completion record |
| M3 — Traceability | +6, 8 | Supervisor review, history, filtering, cancellation |
| M4 — Full | +7, 9 | Downstream triggers, polish, responsive, performance |

---

## Notes

- [P] tasks touch different files — safe to parallelize
- `assertValidTransition` in T005 is the single source of truth for all status changes — never bypass it
- Optimistic lock (`version: Int`) must be threaded through every mutating action call from the UI
- Photos are stored by path only — never store public URLs in the DB; always generate presigned URLs server-side
- All `cancelProductionOrder` calls must preserve evidence — never cascade-delete photos/notes
- Commit after each phase checkpoint; tag M1/M2/M3/M4 milestones
