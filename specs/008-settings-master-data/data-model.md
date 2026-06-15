# Database Schema & Data Models: Settings and Master Data

## 1. Prisma Schema Changes

We will introduce new models and update existing ones in `prisma/schema.prisma` to support localization, warehouses, storage conditions, and dynamic system settings.

### Existing Model Updates

#### [MODIFY] `Department`
We add fields for localization (`nameAr`, `nameEn`) and description:
```prisma
model Department {
  id              String           @id @default(cuid())
  name            String           @unique // System unique key
  nameAr          String           @default("")
  nameEn          String           @default("")
  description     String?
  isActive        Boolean          @default(true)
  createdAt       DateTime         @default(now())
  userDepartments UserDepartment[]

  @@map("departments")
}
```

#### [MODIFY] `ProductionLine`
We add localization fields (`nameAr`, `nameEn`) and description:
```prisma
model ProductionLine {
  id                  String               @id @default(cuid())
  name                String               @unique // System unique key
  nameAr              String               @default("")
  nameEn              String               @default("")
  description         String?
  isActive            Boolean              @default(true)
  createdAt           DateTime             @default(now())
  userProductionLines UserProductionLine[]

  @@map("production_lines")
}
```

#### [MODIFY] `InventoryArea` (Warehouse)
We add a unique warehouse code, localization fields, and description:
```prisma
model InventoryArea {
  id                 String              @id @default(cuid())
  name               String              @unique // System unique key
  code               String              @unique @default("") // e.g. "WH-MAIN"
  nameAr             String              @default("")
  nameEn             String              @default("")
  description        String?
  isActive           Boolean             @default(true)
  createdAt          DateTime            @default(now())
  userInventoryAreas UserInventoryArea[]

  @@map("inventory_areas")
}
```

---

### New Models

#### [NEW] `StorageCondition`
Represents storage requirement ranges used by batches, labels, and recipes:
```prisma
model StorageCondition {
  id             String   @id @default(cuid())
  nameAr         String
  nameEn         String
  description    String?
  minTemperature Decimal? @db.Decimal(5, 2)
  maxTemperature Decimal? @db.Decimal(5, 2)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("storage_conditions")
}
```

#### [NEW] `LabelTemplate`
Represents available physical label sizes and configurations:
```prisma
model LabelTemplate {
  id         String   @id @default(cuid())
  name       String   @unique // e.g. "Standard Label"
  dimensions String   // e.g. "50x30mm"
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("label_templates")
}
```

#### [NEW] `SystemSetting`
Stores global preferences, thresholds, and configuration settings in structured JSON formats:
```prisma
model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique // e.g. "general_preferences", "qr_config", "notification_thresholds"
  value       Json     // Stores structured settings (JSONB in PostgreSQL)
  description String?
  updatedAt   DateTime @updatedAt
  updatedById String?

  @@map("system_settings")
}
```

---

### Existing Enum Updates

#### [MODIFY] `AuditAction`
We append administrative setting actions to the `AuditAction` enum in `schema.prisma`:
```prisma
enum AuditAction {
  ...
  SYSTEM_SETTING_UPDATED
  MASTER_DATA_CREATED
  MASTER_DATA_UPDATED
  MASTER_DATA_ARCHIVED
  MASTER_DATA_RESTORED
}
```

---

## 2. Setting Value Formats (Stored in JSON)

The `value` field in the `SystemSetting` model will store Zod-validated JSON payloads matching these structures:

### Key: `general_preferences`
```json
{
  "companyName": "Pino Restaurant",
  "companyLogoUrl": "/images/logo.png",
  "timeZone": "Asia/Riyadh",
  "dateFormat": "YYYY-MM-DD",
  "defaultLanguage": "ar"
}
```

### Key: `qr_config`
```json
{
  "qrEnabled": true,
  "qrSize": 150,
  "errorCorrectionLevel": "M" // "L", "M", "Q", "H"
}
```

### Key: `notification_thresholds`
```json
{
  "lowStockThresholdPercent": 10,
  "nearExpiryThresholdDays": 7,
  "productionDelayThresholdMinutes": 30
}
```

---

## 3. Data Integrity & Validation Rules

1. **Required Fields**: Name fields in both English (`nameEn`) and Arabic (`nameAr`) must not be empty.
2. **Archiving Gate**:
   - Master data records cannot be hard deleted.
   - When deactivating (`isActive: false`), the application will block new references from being created (e.g., you cannot select a deactivated warehouse as a destination warehouse for a transfer).
   - Existing foreign keys on historical tables are preserved, guaranteeing that old inventory logs and audit trails remain correct.
