# Data Model & Schema Design: Batch Management & Traceability

This document defines the Prisma database models, fields, relationships, and validation constraints for the Batch Management and Product Traceability module.

---

## Database Models

Eight new models and one new enum are introduced to represent the batch lifecycle, printing, containers, disposals, and audit logs.

### 1. New Enum: `BatchStatus`

```prisma
enum BatchStatus {
  ACTIVE    // Available for use/distribution
  CONSUMED  // Fully used up in operations
  EXPIRED   // Past the expiry date
  DISPOSED  // Manually disposed due to quality, spoilage, etc.
}
```

---

### 2. Model: `ProductionBatch`
Represents the main traceability unit generated from a completed production order.

```prisma
model ProductionBatch {
  id                String               @id @default(cuid())
  batchNumber       String               @unique // B-YYYY-NNNNN format
  status            BatchStatus          @default(ACTIVE)
  
  // Recipe and Order linkages
  recipeId          String
  recipe            Recipe               @relation(fields: [recipeId], references: [id])
  recipeVersionId   String
  recipeVersion     RecipeVersion        @relation(fields: [recipeVersionId], references: [id])
  productionOrderId String               @unique
  productionOrder   ProductionOrder      @relation(fields: [productionOrderId], references: [id])
  
  // Production Details
  productionDate    DateTime             @default(now())
  expiryDate        DateTime
  producedQuantity  Decimal              @db.Decimal(10, 3)
  unit              YieldUnit            // Enums from recipes: KG, GRAM, LITER, etc.
  
  // Storage Context
  warehouseId       String
  warehouse         Warehouse            @relation(fields: [warehouseId], references: [id])
  
  // Auditing
  createdById       String
  createdBy         User                 @relation("BatchCreator", fields: [createdById], references: [id])
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  // Relationships
  containers        BatchContainer[]
  statusHistory     BatchStatusHistory[]
  printHistory      BatchPrintHistory[]
  disposals         BatchDisposal[]
  qrCode            BatchQrCode?
  labels            BatchLabel[]
  auditLogs         BatchAuditLog[]

  @@index([status])
  @@index([expiryDate])
  @@index([warehouseId])
  @@map("production_batches")
}
```

---

### 3. Model: `BatchContainer`
Tracks splitting a production batch across multiple physical storage containers.

```prisma
model BatchContainer {
  id              String               @id @default(cuid())
  batchId         String
  batch           ProductionBatch      @relation(fields: [batchId], references: [id], onDelete: Cascade)
  containerNumber String               @unique // e.g. B-YYYY-NNNNN-C1
  quantity        Decimal              @db.Decimal(10, 3)
  status          BatchStatus          @default(ACTIVE)
  
  warehouseId     String
  warehouse       Warehouse            @relation(fields: [warehouseId], references: [id])
  
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  // Relationships
  labels          BatchLabel[]
  printHistory    BatchPrintHistory[]
  disposals       BatchDisposal[]

  @@index([batchId])
  @@index([warehouseId])
  @@map("batch_containers")
}
```

---

### 4. Model: `BatchQrCode`
Stores the generated QR code graphics reference and URL mapping.

```prisma
model BatchQrCode {
  id           String          @id @default(cuid())
  batchId      String          @unique
  batch        ProductionBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  qrCodeData   String          // Base64-encoded Data URL PNG or SVG string
  targetUrl    String          // The gated traceability page URL
  generatedAt  DateTime        @default(now())

  @@map("batch_qr_codes")
}
```

---

### 5. Model: `BatchLabel`
Stores snapshots of the label contents at the time of layout compilation.

```prisma
model BatchLabel {
  id                  String           @id @default(cuid())
  batchId             String
  batch               ProductionBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)
  containerId         String?
  container           BatchContainer?  @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  labelTemplate       String           // SMALL (50x50), STANDARD (100x50), LARGE (100x100)
  
  // Snapshotted fields for printing consistency
  productName         String
  batchNumber         String
  productionDate      DateTime
  expiryDate          DateTime
  quantity            Decimal          @db.Decimal(10, 3)
  unit                String
  
  // Optional Fields
  storageInstructions String?
  productCode         String?
  warehouseName       String?

  createdAt           DateTime         @default(now())

  @@index([batchId])
  @@index([containerId])
  @@map("batch_labels")
}
```

---

### 6. Model: `BatchStatusHistory`
Audit history of the lifecycle state transitions of a batch.

```prisma
model BatchStatusHistory {
  id          String          @id @default(cuid())
  batchId     String
  batch       ProductionBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  
  fromStatus  BatchStatus?
  toStatus    BatchStatus
  
  changedById String
  changedBy   User            @relation(fields: [changedById], references: [id])
  reason      String?
  changedAt   DateTime        @default(now())

  @@index([batchId])
  @@map("batch_status_history")
}
```

---

### 7. Model: `BatchPrintHistory`
Audit ledger of label prints and reprints.

```prisma
model BatchPrintHistory {
  id            String           @id @default(cuid())
  batchId       String
  batch         ProductionBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)
  containerId   String?
  container     BatchContainer?  @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  printedById   String
  printedBy     User             @relation(fields: [printedById], references: [id])
  printedAt     DateTime         @default(now())
  
  labelTemplate String           // SMALL, STANDARD, LARGE
  isReprint     Boolean          @default(false)
  reprintReason String?          // Required if isReprint = true

  @@index([batchId])
  @@map("batch_print_history")
}
```

---

### 8. Model: `BatchDisposal`
Tracks details of batch/container disposals due to expiration, damage, or quality failure.

```prisma
model BatchDisposal {
  id               String           @id @default(cuid())
  batchId          String
  batch            ProductionBatch  @relation(fields: [batchId], references: [id], onDelete: Cascade)
  containerId      String?
  container        BatchContainer?  @relation(fields: [containerId], references: [id], onDelete: Cascade)
  
  quantityDisposed Decimal          @db.Decimal(10, 3)
  disposedById     String
  disposedBy       User             @relation(fields: [disposedById], references: [id])
  disposedAt       DateTime         @default(now())
  
  reason           String           // e.g., "EXPIRED", "DAMAGED_GOODS", "QUALITY_ISSUE"
  notes            String?          // Detailed reasoning/findings

  @@index([batchId])
  @@map("batch_disposals")
}
```

---

### 9. Model: `BatchAuditLog`
Prisma model for auditing batch mutations.

```prisma
model BatchAuditLog {
  id            String          @id @default(cuid())
  batchId       String
  batch         ProductionBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  
  actorId       String
  actor         User            @relation(fields: [actorId], references: [id])
  actorName     String
  
  action        String          // e.g., "BATCH_CREATED", "CONTAINER_SPLIT", "REPRINT_LOGGED"
  previousValue Json?
  newValue      Json?
  
  createdAt     DateTime        @default(now())

  @@index([batchId])
  @@map("batch_audit_logs")
}
```

---

## Validation & Business Rules

1. **Batch Number Uniqueness**: Batch number must match `B-\d{4}-\d{5}` and be unique.
2. **Expiry Constraint**: Expiry Date must be chronologically after the Production Date.
3. **Reprint Constraint**: Every print history record marked as `isReprint = true` must have a non-empty `reprintReason` containing at least 5 characters.
4. **Disposal Constraint**: Disposing of quantity exceeding the batch's current available quantity (accounting for already consumed/disposed portions) must fail.
5. **Role Gating**:
   * Creating a batch container split requires `Supervisor` or `Admin` privileges.
   * Disposing of a batch requires `Supervisor` or `Admin` privileges.
   * Modifying batch status to `CONSUMED` is accessible to `Warehouse Staff`, `Supervisor`, and `Admin`.
