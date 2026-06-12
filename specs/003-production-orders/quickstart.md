# Quickstart: Production Orders — Validation Guide

**Feature**: `003-production-orders`  
**Phase**: 1 — Design  
**Date**: 2026-06-13

---

## Prerequisites

1. Dev server running: `npm run dev`
2. Database migrated: `npx prisma migrate dev`
3. At least one `RecipeCategory` and one `ACTIVE` `Recipe` with a published `RecipeVersion` (at least 2 steps; at least one step with `requiresPhoto`, one with `requiresNotes`)
4. Two seeded users:
   - `supervisor@pino.test` — role with `production-orders:*` permissions
   - `staff@pino.test` — role with `production-orders:execute`, `production-orders:claim`; `UserRecipeCategory` linking them to the test recipe's category
5. Supabase Storage bucket `production-evidence` created (private)

---

## Scenario 1: Full Happy Path — Assigned Order

**Validates**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-008/009/010, FR-011, FR-012, FR-013, FR-014, SC-001, SC-002

**Steps**:

1. Log in as `supervisor@pino.test`
2. Navigate to `/production/new`
3. Select an active recipe — verify list shows only `ACTIVE` recipes
4. Set target quantity = 5 (inherits unit from recipe e.g. KG)
5. Select `staff@pino.test` as assignee
6. Submit → verify redirect to order detail; status badge shows **Pending**
7. Verify `orderNumber` matches `PO-YYYYMMDD-NNNN` format
8. Log out; log in as `staff@pino.test`
9. Navigate to `/production` → verify the assigned order appears in "My Orders"
10. Open the order → verify all recipe steps are listed in sequence; Step 1 is active; future steps are locked
11. Click **Start Production** → verify status transitions to **In Progress**; `startedAt` is recorded
12. On Step 1 (requires photo): attempt to advance without a photo → verify blocked with validation message
13. Upload a photo → verify upload succeeds and photo thumbnail appears
14. Advance to Step 2 (requires notes): enter a note → verify note is saved
15. Advance to Step 3 (requires quantity): enter `4.8` → verify confirmation saved
16. Advance through remaining steps
17. When all steps complete: enter `Produced Quantity = 4.8 KG` → click **Complete Order**
18. Verify status changes to **Completed**
19. Log in as `supervisor@pino.test`; open the order detail
20. **Verify**: produced quantity, start time, end time, duration, staff name, all step photos/notes are present

**Expected outcome**: Completed order with full traceability record.

---

## Scenario 2: Shared Queue — Self-Claim

**Validates**: FR-001a/b/c, SC-001

**Steps**:

1. Log in as `supervisor@pino.test`
2. Create a production order — do NOT assign (leave unassigned)
3. Verify order appears on the list with status **Pending (Unassigned)**
4. Log in as `staff@pino.test`
5. Navigate to `/production/queue` — verify the order appears in the shared queue
6. Click **Claim** → verify order moves from queue to "My Orders"; status becomes **Pending**
7. Attempt to claim the same order from a different staff account → verify error: "already claimed"

---

## Scenario 3: Step Sequencing Enforcement

**Validates**: FR-004, FR-005, FR-007, SC-003

**Steps**:

1. Open an `IN_PROGRESS` order as the assigned staff member
2. Attempt to click on Step 3 while Step 1 is incomplete → verify Step 3 is locked/disabled
3. Attempt to submit a Server Action `completeStep` for Step 3 directly (bypass UI) → verify server returns error: "Step must be completed in sequence"
4. Complete Step 1 → verify Step 2 becomes active
5. Complete Step 2 → verify Step 3 becomes active

---

## Scenario 4: Category-Scoped Permission

**Validates**: FR-001 (category scoping), FR-002

**Steps**:

1. Log in as `staff@pino.test` (assigned to "Dough" category only)
2. Navigate to `/production/new`
3. Verify recipe list shows only recipes from "Dough" category
4. Verify recipes from other categories (e.g., "Sauce") are not present
5. Log in as `supervisor@pino.test`
6. Navigate to `/production/new`
7. Verify all active recipes across all categories appear

---

## Scenario 5: Cancellation

**Validates**: FR-014 (cancellation), SC-005, Edge Case (cancellation irreversibility)

**Steps**:

1. Create an order and start production (status: `IN_PROGRESS`)
2. Upload a photo on Step 1; add a note on Step 2
3. Log in as `supervisor@pino.test`
4. Open the order → click **Cancel Order**
5. Attempt to submit without a reason → verify blocked
6. Enter reason "Equipment failure" → confirm cancellation
7. Verify status is **Cancelled**; cancellation reason and timestamp are recorded
8. Verify Step 1 photo and Step 2 note are still visible in the order detail (evidence retained)
9. Verify no "Reinstate" or "Reopen" button exists
10. Attempt Server Action `cancelProductionOrder` again → verify error: "Cannot cancel a CANCELLED order"

---

## Scenario 6: Auto-Start on First Step Completion

**Validates**: FR-008 (auto-start path), Q3 clarification

**Steps**:

1. Open a `PENDING` order (do NOT click "Start Production")
2. Complete all requirements for Step 1 (photo/notes as applicable)
3. Click **Complete Step 1** directly
4. Verify order transitions to `IN_PROGRESS` automatically
5. Verify `startedAt` is recorded as the timestamp of Step 1 completion
6. Verify `autoStarted: true` returned from action

---

## Scenario 7: RBAC Enforcement

**Validates**: FR-019, Constitution Principle VII

**Steps**:

1. Log in as `staff@pino.test`
2. Attempt to cancel an order via Server Action → verify `UNAUTHORIZED` response
3. Attempt to open another staff member's assigned order detail → verify only own orders visible
4. Log in as unauthenticated user and navigate to `/production` → verify redirect to login

---

## Performance Benchmarks

Run after full feature is implemented:

| Operation | Target | How to measure |
|---|---|---|
| Order list load (100 orders) | ≤ 500 ms | Browser DevTools Network tab |
| Order detail load | ≤ 1 s | Browser DevTools Network tab |
| Step complete action | ≤ 300 ms | Server Action response time |
| Photo upload (2 MB file) | ≤ 3 s | Route Handler response time |

---

## References

- Data model: [data-model.md](./data-model.md)
- Server Action contracts: [contracts/server-actions.md](./contracts/server-actions.md)
- Storage contract: [contracts/storage.md](./contracts/storage.md)
- Feature spec: [spec.md](./spec.md)
