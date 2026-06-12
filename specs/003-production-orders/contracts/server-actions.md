# Interface Contracts: Production Orders — Server Actions

**Feature**: `003-production-orders`  
**File**: `src/features/production-orders/actions.ts`  
**Pattern**: Next.js Server Actions — all functions are `"use server"` and return `ActionResult<T>`

---

## Return Type Convention

All actions return `ActionResult<T>` (existing shared type):

```typescript
type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; code: "VALIDATION" | "UNAUTHORIZED" | "NOT_FOUND" | "CONFLICT" | "INTERNAL"; error: string; details?: string[] }
```

---

## Action: `createProductionOrder`

Creates a new production order from a published recipe version.

```typescript
createProductionOrder(input: {
  recipeVersionId: string;       // Must resolve to an ACTIVE recipe
  targetQuantity?: number;       // Optional planned quantity
  assignedToId?: string | null;  // null → PENDING_UNASSIGNED; string → PENDING
  creationNotes?: string;
}): Promise<ActionResult<{ id: string; orderNumber: string }>>
```

**Guards**:
- Session required (`getServerSession`)
- Permission `production-orders:create` required
- If acting user has role `PRODUCTION_STAFF`: `recipeVersionId` must belong to a recipe category in `UserRecipeCategory` for that user
- If acting user has role `PRODUCTION_SUPERVISOR`: no category restriction
- `recipeVersionId` must resolve to a `RecipeVersion` whose parent `Recipe.status === ACTIVE`
- If `assignedToId` provided: target user must have `production-orders:execute` permission

**Side effects**:
- Creates `ProductionOrder` with status `PENDING_UNASSIGNED` or `PENDING`
- Seeds one `ProductionOrderStep` row per step in `RecipeVersion.snapshot.steps`
- Writes `ProductionOrderStatusHistory` entry
- Writes `AuditLog` entry (`PRODUCTION_ORDER_CREATED`)
- Invalidates `/[locale]/production` and `/[locale]/production/queue`

---

## Action: `assignProductionOrder`

Assigns (or reassigns at Pending stage) an unassigned order to a specific staff member.

```typescript
assignProductionOrder(
  orderId: string,
  assignedToId: string,
  version: number
): Promise<ActionResult<{ newVersion: number }>>
```

**Guards**:
- Permission `production-orders:assign` required
- Order must be in `PENDING_UNASSIGNED` status
- Target user must have `production-orders:execute` permission

**Side effects**:
- Updates `assignedToId`, transitions status to `PENDING`, increments `version`
- Writes `ProductionOrderStatusHistory`
- Writes `AuditLog` (`PRODUCTION_ORDER_ASSIGNED`)

---

## Action: `claimProductionOrder`

Staff member self-claims an unassigned order from the shared queue.

```typescript
claimProductionOrder(
  orderId: string,
  version: number
): Promise<ActionResult<{ newVersion: number }>>
```

**Guards**:
- Permission `production-orders:claim` required
- Order must be in `PENDING_UNASSIGNED` status (optimistic lock on `version`)
- Acting user's category assignments checked against order's recipe category

**Side effects**:
- Sets `assignedToId` = acting user, `claimedById` = acting user
- Transitions status to `PENDING`, increments `version`
- Writes `ProductionOrderStatusHistory`
- Writes `AuditLog` (`PRODUCTION_ORDER_CLAIMED`)

---

## Action: `startProductionOrder`

Explicit "Start Production" action — transitions PENDING → IN_PROGRESS.

```typescript
startProductionOrder(
  orderId: string,
  version: number
): Promise<ActionResult<{ newVersion: number }>>
```

**Guards**:
- Permission `production-orders:execute` required
- Acting user must be `assignedToId` (or have `production-orders:view_all`)
- Order must be in `PENDING` status

**Side effects**:
- Sets `startedAt = now()`, transitions to `IN_PROGRESS`, increments `version`
- Writes `ProductionOrderStatusHistory`
- Writes `AuditLog` (`PRODUCTION_ORDER_STARTED`)

---

## Action: `completeStep`

Marks the current step complete after validating all requirements are met.

```typescript
completeStep(
  orderId: string,
  stepId: string,
  input: {
    confirmedQuantity?: number;   // Required if step.requiresQuantity
    confirmedUnit?: string;
  },
  version: number
): Promise<ActionResult<{ newVersion: number; autoStarted: boolean }>>
```

**Guards**:
- Permission `production-orders:execute` required
- Acting user must be `assignedToId`
- Order must be `PENDING` or `IN_PROGRESS`
- `stepId` must be the lowest-numbered incomplete step (enforced server-side)
- If `requiresPhoto`: at least one `ProductionOrderStepPhoto` must exist for this step
- If `requiresNotes`: at least one `ProductionOrderStepNote` must exist for this step
- If `requiresQuantity`: `confirmedQuantity > 0` required

**Side effects** (in transaction):
- Sets `step.isCompleted = true`, `step.completedAt`, `step.completedById`
- If `requiresQuantity`: sets `confirmedQuantity` and `confirmedUnit`
- If order was `PENDING` (implicit auto-start): sets `order.startedAt = now()`, transitions to `IN_PROGRESS`, writes `ProductionOrderStatusHistory` + `AuditLog (PRODUCTION_ORDER_STARTED)`, `autoStarted = true`
- Sets step `startedAt` if not yet set (on first interaction)
- Writes `AuditLog` (`PRODUCTION_ORDER_STEP_COMPLETED`)
- Increments order `version`

---

## Action: `completeProductionOrder`

Finalizes a completed order once all steps are done.

```typescript
completeProductionOrder(
  orderId: string,
  producedQuantity: number,
  version: number
): Promise<ActionResult<{ newVersion: number }>>
```

**Guards**:
- Permission `production-orders:complete` required
- Acting user must be `assignedToId`
- Order must be `IN_PROGRESS`
- All steps must be `isCompleted = true`
- `producedQuantity > 0`

**Side effects**:
- Sets `producedQuantity`, `completedAt = now()`, `completedById`
- Calculates `durationSeconds = completedAt - startedAt`
- Transitions status to `COMPLETED`, increments `version`
- Writes `ProductionOrderStatusHistory`
- Writes `AuditLog` (`PRODUCTION_ORDER_COMPLETED`)

---

## Action: `cancelProductionOrder`

Cancels an order in any non-terminal state.

```typescript
cancelProductionOrder(
  orderId: string,
  cancellationReason: string,
  version: number
): Promise<ActionResult<{ newVersion: number }>>
```

**Guards**:
- Permission `production-orders:cancel` required
- Order must be in `PENDING_UNASSIGNED`, `PENDING`, or `IN_PROGRESS`
- `cancellationReason` must be non-empty (min 10 chars)

**Side effects**:
- Sets `cancelledById`, `cancellationReason`, `cancelledAt`
- Transitions to `CANCELLED`, increments `version`
- Does NOT delete any photos, notes, or step records
- Writes `ProductionOrderStatusHistory` (with reason)
- Writes `AuditLog` (`PRODUCTION_ORDER_CANCELLED`)

---

## Action: `addStepNote`

Adds a note to a step. Can be called before or after step completion (evidence preserved either way).

```typescript
addStepNote(
  orderId: string,
  stepId: string,
  content: string
): Promise<ActionResult<{ id: string }>>
```

**Guards**:
- Permission `production-orders:execute`
- Acting user must be `assignedToId`
- Order must be `PENDING` or `IN_PROGRESS`
- `content` min 1 char, max 2000 chars

**Side effects**:
- Creates `ProductionOrderStepNote`
- Writes `AuditLog` (`PRODUCTION_ORDER_NOTE_ADDED`)

---

## Read Queries (in `queries.ts`)

These are data-fetching functions for Server Components (no `"use server"` — used directly in page components):

```typescript
// List orders (paginated, filterable)
getProductionOrderList(filters, pagination): Promise<{ items: OrderListItemDto[]; total: number; nextCursor?: string }>

// Unassigned queue
getUnassignedQueue(): Promise<OrderQueueItemDto[]>

// Order detail (full execution state)
getProductionOrderDetail(id: string): Promise<OrderDetailDto>

// My assigned orders (staff view)
getMyProductionOrders(): Promise<OrderListItemDto[]>

// Presigned URL for step photo display
getStepPhotoUrl(storagePath: string): Promise<string>
```
