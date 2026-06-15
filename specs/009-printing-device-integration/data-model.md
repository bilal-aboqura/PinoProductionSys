# Database Schema & Data Models: Printing and Device Integration

## 1. Prisma Schema Changes

We will introduce new models in `prisma/schema.prisma` to manage printers, print templates, print queue jobs, histories, and reprint logs.

### New Models

#### `Printer`
Represents physical printers configured on client terminals:
```prisma
model Printer {
  id          String      @id @default(cuid())
  name        String      @unique // e.g. "Kitchen Label Printer"
  description String?
  type        PrinterType @default(THERMAL)
  isDefault   Boolean     @default(false)
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  printJobs   PrintJob[]

  @@map("printers")
}

enum PrinterType {
  THERMAL
  STANDARD
  PDF_OUTPUT
}
```

#### `PrintTemplate`
Predefined label template specifications:
```prisma
model PrintTemplate {
  id         String     @id @default(cuid())
  name       String     @unique // e.g. "Small Label", "Standard Label", "Large Label"
  dimensions String     // e.g. "50x50mm", "100x50mm", "100x100mm"
  isActive   Boolean    @default(true)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  printJobs  PrintJob[]

  @@map("print_templates")
}
```

#### `PrintJob`
Represents an individual print queue entry:
```prisma
model PrintJob {
  id          String         @id @default(cuid())
  printerId   String?
  printer     Printer?       @relation(fields: [printerId], references: [id])
  templateId  String
  template    PrintTemplate  @relation(fields: [templateId], references: [id])
  status      PrintJobStatus @default(PENDING)
  targetType  PrintTarget
  targetId    String         // Target ID of the associated Batch, Container, or Warehouse
  quantity    Int            @default(1)
  payload     Json           // JSON string containing printable metadata (names, dates, weight, QR string)
  createdById String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  history     PrintHistory[]
  reprints    PrintReprint[]

  @@map("print_jobs")
}

enum PrintJobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

enum PrintTarget {
  BATCH
  CONTAINER
  WAREHOUSE
}
```

#### `PrintHistory`
A search-indexed read log tracking actual print attempt outcomes:
```prisma
model PrintHistory {
  id           String   @id @default(cuid())
  printJobId   String
  printJob     PrintJob @relation(fields: [printJobId], references: [id], onDelete: Cascade)
  printerName  String
  templateName String
  actorId      String
  actorName    String
  status       String   // e.g. "SUCCESS", "FAILED"
  errorMessage String?
  createdAt    DateTime @default(now())

  @@index([createdAt])
  @@index([actorId])
  @@map("print_history")
}
```

#### `PrintReprint`
Represents authorized print retries and reprints for existing jobs:
```prisma
model PrintReprint {
  id              String        @id @default(cuid())
  printJobId      String
  printJob        PrintJob      @relation(fields: [printJobId], references: [id], onDelete: Cascade)
  reason          ReprintReason
  customReason    String?
  requestedById   String
  requestedByName String
  createdAt       DateTime      @default(now())

  @@map("print_reprints")
}

enum ReprintReason {
  DAMAGE
  LOSS
  PRINT_ERROR
  OTHER
}
```

---

### Existing Enum Updates

#### `AuditAction`
We append print-related events to the `AuditAction` enum:
```prisma
enum AuditAction {
  ...
  PRINTER_CREATED
  PRINTER_UPDATED
  LABEL_PRINTED
  LABEL_REPRINTED
  PRINT_JOB_FAILED
}
```

---

## 2. Dynamic JSON Payload Format (Stored in `PrintJob.payload`)

Depending on `targetType`, the `payload` JSONB column stores structured metadata:

### Target Type: `BATCH`
```json
{
  "productName": "Sourdough Starter",
  "batchNumber": "B-20260615-001",
  "productionDate": "2026-06-15T16:20:00Z",
  "expiryDate": "2026-06-22T16:20:00Z",
  "quantity": 10.5,
  "unit": "KG",
  "qrCodeData": "https://pino.sys/batches/B-20260615-001",
  "storageInstructions": "Keep refrigerated below 4°C"
}
```

### Target Type: `CONTAINER`
```json
{
  "containerNumber": "C-003",
  "productName": "Sourdough Starter",
  "quantity": 3.5,
  "batchNumber": "B-20260615-001",
  "qrCodeData": "https://pino.sys/containers/C-003"
}
```

### Target Type: `WAREHOUSE`
```json
{
  "warehouseName": "Cold Store Room A",
  "warehouseCode": "WH-COLD-A",
  "qrCodeData": "https://pino.sys/warehouses/WH-COLD-A"
}
```
