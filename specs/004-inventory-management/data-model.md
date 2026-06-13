# Data Model & Schema Design: Inventory Management & Material Consumption

This document defines the Prisma database models, fields, relationships, and validation constraints for the Inventory Management module.

---

## Migration & Renaming Plan

To align the existing codebase with the requested database tables:
1. Rename Prisma model `InventoryArea` to `Warehouse` and map it to database table `warehouses`.
2. Rename Prisma model `UserInventoryArea` to `UserWarehouse` and map it to database table `user_warehouses` (to track warehouse action scoping).

---

## Prisma Schema Models

### 1. InventoryCategory
Tracks groups of inventory items (e.g., Vegetables, Dairy, Packaging, Semi-Finished).
```prisma
model InventoryCategory {
  id          String          @id @default(cuid())
  name        String          @unique
  description String?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  items       InventoryItem[]

  @@map("inventory_categories")
}
```

### 2. InventoryItem
Tracks the catalog definition of stockable items.
```prisma
model InventoryItem {
  id            String              @id @default(cuid())
  code          String              @unique // e.g. "RAW-FLOUR-001"
  nameAr        String              // Arabic Name
  nameEn        String              // English Name
  itemType      ItemType            // enum: RAW_MATERIAL, FINISHED_PRODUCT
  categoryId    String
  category      InventoryCategory   @relation(fields: [categoryId], references: [id])
  unit          Unit                // enum: KG, GRAM, LITER, MILLILITER, PIECE
  minStockLevel Decimal             @default(0.0) @db.Decimal(10, 3)
  isActive      Boolean             @default(true)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  balances      InventoryBalance[]
  movements     StockMovement[]
  ingredients   RecipeIngredient[]  // Links back to existing RecipeIngredient model
  transfers     InventoryTransfer[]
  adjustments   InventoryAdjustment[]
  wasteRecords  InventoryWasteRecord[]
  consumption   InventoryConsumptionLog[]
  outputs       InventoryOutputLog[]

  @@index([code])
  @@index([itemType])
  @@map("inventory_items")
}

enum ItemType {
  RAW_MATERIAL
  FINISHED_PRODUCT
}

enum Unit {
  KG
  GRAM
  LITER
  MILLILITER
  PIECE
}
```

### 3. Warehouse
Represents physical storage locations.
```prisma
model Warehouse {
  id             String          @id @default(cuid())
  name           String          @unique
  code           String          @unique // e.g. "WH-MAIN"
  description    String?
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  
  userWarehouses UserWarehouse[]
  balances       InventoryBalance[]
  movements      StockMovement[]
  transfersFrom  InventoryTransfer[] @relation("SourceWarehouse")
  transfersTo    InventoryTransfer[] @relation("DestinationWarehouse")
  adjustments    InventoryAdjustment[]
  wasteRecords   InventoryWasteRecord[]
  consumption    InventoryConsumptionLog[]
  outputs        InventoryOutputLog[]

  @@map("warehouses")
}
```

### 4. UserWarehouse
Tracks user permissions for performing restricted actions inside specific warehouses.
```prisma
model UserWarehouse {
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  assignedAt  DateTime  @default(now())

  @@id([userId, warehouseId])
  @@map("user_warehouses")
}
```

### 5. InventoryBalance
Tracks cached current inventory quantities per item per warehouse.
```prisma
model InventoryBalance {
  id              String        @id @default(cuid())
  warehouseId     String
  warehouse       Warehouse     @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  
  currentQuantity  Decimal      @default(0.0) @db.Decimal(10, 3)
  reservedQuantity Decimal      @default(0.0) @db.Decimal(10, 3)
  availableQuantity Decimal     @default(0.0) @db.Decimal(10, 3) // Current - Reserved

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([warehouseId, inventoryItemId])
  @@map("inventory_balances")
}
```

### 6. StockMovement
The immutable audit ledger of all stock changes.
```prisma
model StockMovement {
  id              String        @id @default(cuid())
  timestamp       DateTime      @default(now())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  warehouseId     String
  warehouse       Warehouse     @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id], onDelete: Cascade)
  
  quantityDelta   Decimal       @db.Decimal(10, 3) // Positive or Negative
  movementType    MovementType
  sourceRefId     String?       // Links to ProductionOrder, Transfer, Adjustment, or Waste ID

  @@index([timestamp])
  @@index([warehouseId, inventoryItemId])
  @@map("inventory_movements")
}

enum MovementType {
  PURCHASE
  PRODUCTION_CONSUMPTION
  PRODUCTION_OUTPUT
  TRANSFER_OUT
  TRANSFER_IN
  ADJUSTMENT_INCREASE
  ADJUSTMENT_DECREASE
  WASTE
  RETURN
}
```

### 7. InventoryTransfer
Records transfers of stock between warehouses.
```prisma
model InventoryTransfer {
  id             String         @id @default(cuid())
  userId         String
  user           User           @relation(fields: [userId], references: [id])
  itemId         String
  item           InventoryItem  @relation(fields: [itemId], references: [id])
  
  sourceWhId     String
  sourceWh       Warehouse      @relation("SourceWarehouse", fields: [sourceWhId], references: [id])
  destWhId       String
  destWh         Warehouse      @relation("DestinationWarehouse", fields: [destWhId], references: [id])
  
  quantity       Decimal        @db.Decimal(10, 3)
  timestamp      DateTime       @default(now())
  notes          String?

  @@map("inventory_transfers")
}
```

### 8. InventoryAdjustment
Records manual adjustments to correct inventory counts.
```prisma
model InventoryAdjustment {
  id              String            @id @default(cuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  warehouseId     String
  warehouse       Warehouse         @relation(fields: [warehouseId], references: [id])
  inventoryItemId String
  inventoryItem   InventoryItem     @relation(fields: [inventoryItemId], references: [id])
  
  quantityDelta   Decimal           @db.Decimal(10, 3)
  reason          AdjustmentReason
  notes           String?
  timestamp       DateTime          @default(now())

  @@map("inventory_adjustments")
}

enum AdjustmentReason {
  STOCK_COUNT_CORRECTION
  DAMAGED_GOODS
  INVENTORY_RECONCILIATION
  LOST_MATERIALS
}
```

### 9. InventoryWasteRecord
Records production waste and spoilage.
```prisma
model InventoryWasteRecord {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  warehouseId     String
  warehouse       Warehouse     @relation(fields: [warehouseId], references: [id])
  inventoryItemId String
  inventoryItem   InventoryItem @relation(fields: [inventoryItemId], references: [id])
  
  quantity        Decimal       @db.Decimal(10, 3)
  reason          WasteReason
  notes           String?
  timestamp       DateTime      @default(now())

  @@map("inventory_waste_records")
}

enum WasteReason {
  BURNED_BATCH
  SPOILAGE
  PRODUCTION_LOSS
  DAMAGED_MATERIAL
}
```

### 10. InventoryConsumptionLog
Tracks raw materials consumed during production order execution.
```prisma
model InventoryConsumptionLog {
  id                String         @id @default(cuid())
  productionOrderId String         // Links to ProductionOrder
  warehouseId       String
  warehouse         Warehouse      @relation(fields: [warehouseId], references: [id])
  inventoryItemId   String
  inventoryItem     InventoryItem  @relation(fields: [inventoryItemId], references: [id])
  
  quantityConsumed  Decimal        @db.Decimal(10, 3)
  timestamp         DateTime       @default(now())

  @@index([productionOrderId])
  @@map("inventory_consumption_logs")
}
```

### 11. InventoryOutputLog
Tracks finished goods added when a production order is completed.
```prisma
model InventoryOutputLog {
  id                String         @id @default(cuid())
  productionOrderId String         // Links to ProductionOrder
  warehouseId       String
  warehouse         Warehouse      @relation(fields: [warehouseId], references: [id])
  inventoryItemId   String
  inventoryItem     InventoryItem  @relation(fields: [inventoryItemId], references: [id])
  
  quantityProduced  Decimal        @db.Decimal(10, 3)
  timestamp         DateTime       @default(now())

  @@index([productionOrderId])
  @@map("inventory_output_logs")
}
```

### 12. InventoryAuditLog
Audit trail of structural data mutations (e.g. creating/deactivating items or warehouses).
```prisma
model InventoryAuditLog {
  id            String      @id @default(cuid())
  timestamp     DateTime    @default(now())
  actorId       String
  actor         User        @relation(fields: [actorId], references: [id])
  action        String      // e.g. "ITEM_CREATE", "WH_UPDATE"
  targetId      String      // ID of the target Item or Warehouse
  previousValue Json?
  newValue      Json?

  @@map("inventory_audit_logs")
}
```
