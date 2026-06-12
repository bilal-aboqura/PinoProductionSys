# Data Model: Production Orders

**Feature**: `003-production-orders`  
**Phase**: 1 — Design  
**Date**: 2026-06-13

---

## Overview

Six new Prisma models and one new Prisma enum are added to the existing schema. All new models follow the existing naming and field conventions. The existing `AuditAction` enum is extended with production order actions. The existing `UserRecipeCategory` join table is reused for category-scoped creation permission enforcement (no new table needed).

---

## New Enum: `ProductionOrderStatus`

```prisma
enum ProductionOrderStatus {
  PENDING_UNASSIGNED   // Created but no assignee yet; visible in shared queue
  PENDING              // Assigned to a staff member; not yet started
  IN_PROGRESS          // Production has begun; steps being executed
  COMPLETED            // All steps done; immutable production record
  CANCELLED            // Terminated by supervisor; irreversible; evidence retained
}
```

---

## New Model: `ProductionOrder`

```prisma
model ProductionOrder {
  id                  String                @id @default(cuid())
  orderNumber         String                @unique   // PO-YYYYMMDD-NNNN
  status              ProductionOrderStatus @default(PENDING_UNASSIGNED)
  version             Int                   @default(0) // optimistic lock

  // Recipe version lock (immutable after creation)
  recipeId            String
  recipeVersionId     String                // FK → RecipeVersion
  recipeNameSnapshot  String                // copied from snapshot at creation
  yieldUnit           String                // copied from snapshot at creation

  // Target quantity set at creation
  targetQuantity      Decimal?              @db.Decimal(10, 3)

  // Actual produced quantity — set only at completion
  producedQuantity    Decimal?              @db.Decimal(10, 3)

  // Notes added at order creation time (optional)
  creationNotes       String?

  // Traceability — who did what
  createdById         String                // always set
  assignedToId        String?               // set at creation (pre-assign) or on claim
  claimedById         String?               // set when staff self-claims from queue
  completedById       String?               // set at completion

  // Cancellation
  cancelledById       String?
  cancellationReason  String?
  cancelledAt         DateTime?

  // Timestamps
  createdAt           DateTime              @default(now())
  startedAt           DateTime?             // written once on first IN_PROGRESS transition
  completedAt         DateTime?             // written at completion

  // Computed / stored duration (seconds)
  durationSeconds     Int?

  // Relations
  steps               ProductionOrderStep[]
  statusHistory       ProductionOrderStatusHistory[]

  @@index([status])
  @@index([assignedToId])
  @@index([recipeVersionId])
  @@index([createdAt])
  @@map("production_orders")
}
```

**Validation rules**:
- `orderNumber` must match `PO-\d{8}-\d{4}` — enforced at generation time
- `producedQuantity` must be > 0 when set (enforced in Server Action)
- `producedQuantity` required before status can transition to `COMPLETED`
- `cancellationReason` required when `cancelledById` is set

---

## New Model: `ProductionOrderStep`

One row per step in the recipe version snapshot, seeded at order creation.

```prisma
model ProductionOrderStep {
  id                  String         @id @default(cuid())
  orderId             String
  order               ProductionOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Copied from recipe version snapshot at order creation
  stepNumber          Int
  title               String
  instructions        String
  estimatedMinutes    Int?
  requiresPhoto       Boolean        @default(false)
  requiresNotes       Boolean        @default(false)
  requiresQuantity    Boolean        @default(false)

  // Execution state
  isCompleted         Boolean        @default(false)
  completedById       String?
  startedAt           DateTime?
  completedAt         DateTime?

  // Confirmed quantity (for steps with requiresQuantity)
  confirmedQuantity   Decimal?       @db.Decimal(10, 3)
  confirmedUnit       String?

  // Relations
  photos              ProductionOrderStepPhoto[]
  notes               ProductionOrderStepNote[]

  @@unique([orderId, stepNumber])
  @@index([orderId, stepNumber])
  @@map("production_order_steps")
}
```

**Validation rules**:
- Steps can only be completed in ascending `stepNumber` order
- A step with `requiresPhoto = true` cannot be completed until at least one `ProductionOrderStepPhoto` exists
- A step with `requiresNotes = true` cannot be completed until at least one `ProductionOrderStepNote` exists
- A step with `requiresQuantity = true` cannot be completed until `confirmedQuantity` is set > 0

---

## New Model: `ProductionOrderStepPhoto`

```prisma
model ProductionOrderStepPhoto {
  id          String               @id @default(cuid())
  stepId      String
  step        ProductionOrderStep  @relation(fields: [stepId], references: [id], onDelete: Cascade)
  storagePath String               // Supabase Storage path (private bucket)
  mimeType    String               @default("image/jpeg")
  uploadedById String
  uploadedAt  DateTime             @default(now())

  @@index([stepId])
  @@map("production_order_step_photos")
}
```

---

## New Model: `ProductionOrderStepNote`

```prisma
model ProductionOrderStepNote {
  id          String               @id @default(cuid())
  stepId      String
  step        ProductionOrderStep  @relation(fields: [stepId], references: [id], onDelete: Cascade)
  content     String               // Max 2000 chars
  addedById   String
  addedAt     DateTime             @default(now())

  @@index([stepId])
  @@map("production_order_step_notes")
}
```

---

## New Model: `ProductionOrderStatusHistory`

Immutable log of every status transition.

```prisma
model ProductionOrderStatusHistory {
  id         String                @id @default(cuid())
  orderId    String
  order      ProductionOrder       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fromStatus ProductionOrderStatus?
  toStatus   ProductionOrderStatus
  changedById String
  reason     String?               // required for CANCELLED transitions
  changedAt  DateTime              @default(now())

  @@index([orderId, changedAt])
  @@map("production_order_status_history")
}
```

---

## Extended Enum: `AuditAction` (additions to existing)

The following values are added to the existing `AuditAction` enum in `schema.prisma`:

```prisma
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

---

## State Transition Diagram

```
CREATE (unassigned)  →  PENDING_UNASSIGNED
CREATE (pre-assigned) → PENDING

PENDING_UNASSIGNED  ──[claim/assign]──►  PENDING
PENDING             ──[start / step1]──►  IN_PROGRESS
IN_PROGRESS         ──[finalize]──────►  COMPLETED

PENDING_UNASSIGNED  ──[cancel]──────►  CANCELLED
PENDING             ──[cancel]──────►  CANCELLED
IN_PROGRESS         ──[cancel]──────►  CANCELLED

COMPLETED  → (immutable, no further transitions)
CANCELLED  → (immutable, no further transitions)
```

---

## Key Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| `production_orders` | `status` | Filter by status (list views, queue) |
| `production_orders` | `assignedToId` | Staff "my orders" view |
| `production_orders` | `recipeVersionId` | Traceability lookups |
| `production_orders` | `createdAt` | Date-range filtering |
| `production_order_steps` | `(orderId, stepNumber)` | Step sequence enforcement |
| `production_order_step_photos` | `stepId` | Photo list per step |
| `production_order_step_notes` | `stepId` | Note list per step |
| `production_order_status_history` | `(orderId, changedAt)` | Audit trail per order |

---

## Reused Models (no schema changes)

| Model | How reused |
|---|---|
| `RecipeVersion` | Linked via `recipeVersionId`; `snapshot` JSON provides step definitions |
| `UserRecipeCategory` | Queried to enforce category-scoped creation permission |
| `User` | Referenced for all actor fields (createdById, assignedToId, etc.) |
| `AuditLog` | Extended with new action codes; single table for all system audit events |
