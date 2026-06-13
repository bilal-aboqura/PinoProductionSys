# Interface Contract: Next.js Server Actions (Inventory Management)

This document defines the TypeScript interface contracts, parameters, returns, and error handling for the Next.js Server Actions in the Inventory Management module.

All actions are protected by authentication middleware and enforce Role-Based Access Control (RBAC).

---

## 1. Item Management Actions

### `createInventoryItem`
* **Description**: Create a new inventory item in the catalog.
* **Roles Allowed**: `Administrator`, `InventoryManager`
* **Signature**:
  ```typescript
  export async function createInventoryItem(input: CreateItemInput): Promise<ActionResult<InventoryItemDto>>
  ```
* **Validation Rules**:
  - `code`: Unique, string, non-empty, alphanumeric and dashes, max 30 chars.
  - `nameAr` / `nameEn`: Required, min 3, max 100 chars.
  - `itemType`: Must be `RAW_MATERIAL` or `FINISHED_PRODUCT`.
  - `categoryId`: Must link to an active `InventoryCategory`.
  - `unit`: Must be one of `KG`, `GRAM`, `LITER`, `MILLILITER`, `PIECE`.
  - `minStockLevel`: Non-negative decimal, default 0.0.

### `updateInventoryItem`
* **Description**: Edit an existing inventory item.
* **Roles Allowed**: `Administrator`, `InventoryManager`
* **Signature**:
  ```typescript
  export async function updateInventoryItem(id: string, input: UpdateItemInput): Promise<ActionResult<InventoryItemDto>>
  ```

### `deactivateInventoryItem`
* **Description**: Deactivate an item. Items with movements are soft-deleted (status set to `isActive = false`).
* **Roles Allowed**: `Administrator`, `InventoryManager`
* **Signature**:
  ```typescript
  export async function deactivateInventoryItem(id: string): Promise<ActionResult<{ id: string, isActive: boolean }>>
  ```

---

## 2. Warehouse Management Actions

### `createWarehouse`
* **Description**: Register a new physical storage warehouse.
* **Roles Allowed**: `Administrator`, `InventoryManager`
* **Signature**:
  ```typescript
  export async function createWarehouse(input: CreateWarehouseInput): Promise<ActionResult<WarehouseDto>>
  ```
* **Validation Rules**:
  - `code`: Unique, string, alphanumeric and dashes, max 10 chars.
  - `name`: Unique, min 3, max 50 chars.

### `deactivateWarehouse`
* **Description**: Deactivate a warehouse (soft-delete).
* **Roles Allowed**: `Administrator`, `InventoryManager`
* **Signature**:
  ```typescript
  export async function deactivateWarehouse(id: string): Promise<ActionResult<{ id: string, isActive: boolean }>>
  ```

---

## 3. Stock Transaction Actions

### `transferInventory`
* **Description**: Move stock from a source warehouse to a destination warehouse.
* **Roles Allowed**: `Administrator`, `InventoryManager`, `ProductionSupervisor`, `WarehouseStaff`
* **Signature**:
  ```typescript
  export async function transferInventory(input: TransferInput): Promise<ActionResult<TransferResultDto>>
  ```
* **Validation Rules**:
  - `sourceWhId` and `destWhId` must be different.
  - `itemId` must reference an active `InventoryItem`.
  - `quantity` must be a positive decimal > 0.0.
  - User MUST have access to both `sourceWhId` and `destWhId` via their `UserWarehouse` assignment (unless user is Administrator or InventoryManager).
  - Source warehouse MUST have sufficient `availableQuantity` of the item. Otherwise, block the transaction with `INSUFFICIENT_STOCK` error.

### `recordManualAdjustment`
* **Description**: Adjust stock level (add or subtract) manually for reconciliation or corrections.
* **Roles Allowed**: `Administrator`, `InventoryManager`, `WarehouseStaff`
* **Signature**:
  ```typescript
  export async function recordManualAdjustment(input: AdjustmentInput): Promise<ActionResult<AdjustmentResultDto>>
  ```
* **Validation Rules**:
  - `warehouseId` and `inventoryItemId` must be valid and active.
  - `quantityDelta` can be positive or negative, but must not be zero.
  - User MUST be assigned to the warehouse (unless Admin/Manager).
  - **Negative Stock Check**: If `quantityDelta` is negative and would drive the stock balance below zero, block with `ADJUSTMENT_BLOCKED_NEGATIVE_STOCK` error.
  - `reason` must be one of `STOCK_COUNT_CORRECTION`, `DAMAGED_GOODS`, `INVENTORY_RECONCILIATION`, `LOST_MATERIALS`.
  - `notes` is optional but highly recommended.

### `recordInventoryWaste`
* **Description**: Log ingredient waste or spoilage during kitchen production or storage.
* **Roles Allowed**: `Administrator`, `InventoryManager`, `ProductionSupervisor`, `WarehouseStaff`, `ProductionStaff` (if permitted)
* **Signature**:
  ```typescript
  export async function recordInventoryWaste(input: WasteInput): Promise<ActionResult<WasteResultDto>>
  ```
* **Validation Rules**:
  - `warehouseId` and `inventoryItemId` must be valid.
  - `quantity` must be positive decimal > 0.0.
  - User MUST be assigned to the warehouse.
  - `reason` must be one of `BURNED_BATCH`, `SPOILAGE`, `PRODUCTION_LOSS`, `DAMAGED_MATERIAL`.

---

## 4. Query Actions

### `getInventoryBalances`
* **Description**: Fetch inventory balances filterable by warehouse, search query, item type, or low stock status.
* **Roles Allowed**: All authenticated users (Global visibility).
* **Signature**:
  ```typescript
  export async function getInventoryBalances(filters: BalanceFilters): Promise<ActionResult<PagedList<BalanceDto>>>
  ```

### `getInventoryMovementHistory`
* **Description**: Get chronological ledger logs of all stock movements.
* **Roles Allowed**: All authenticated users.
* **Signature**:
  ```typescript
  export async function getInventoryMovementHistory(filters: MovementFilters): Promise<ActionResult<PagedList<MovementDto>>>
  ```

---

## Shared Types & Error Codes

### Standard Action Result Wrapper
```typescript
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: any } }
```

### Critical Error Codes
* `UNAUTHORIZED`: User is not authenticated.
* `FORBIDDEN`: User role lacks required permission.
* `WAREHOUSE_SCOPE_DENIED`: User is not assigned to the specified warehouse.
* `INSUFFICIENT_STOCK`: Available stock is less than the requested transfer amount.
* `ADJUSTMENT_BLOCKED_NEGATIVE_STOCK`: Manual adjustment would result in a negative stock level.
* `INVALID_UNIT_CONVERSION`: Incompatible units during conversion.
* `DUPLICATE_CODE`: Item code or warehouse code already exists.
