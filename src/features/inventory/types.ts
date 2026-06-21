import type { AdjustmentReason, ItemType, MovementType, Unit } from "@prisma/client";

export const INVENTORY_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  WAREHOUSE_SCOPE_DENIED: "WAREHOUSE_SCOPE_DENIED",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  ADJUSTMENT_BLOCKED_NEGATIVE_STOCK: "ADJUSTMENT_BLOCKED_NEGATIVE_STOCK",
  INVALID_UNIT_CONVERSION: "INVALID_UNIT_CONVERSION",
  DUPLICATE_CODE: "DUPLICATE_CODE",
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL: "INTERNAL"
} as const;

export type InventoryErrorCode = (typeof INVENTORY_ERROR_CODES)[keyof typeof INVENTORY_ERROR_CODES];

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: InventoryErrorCode; message: string; details?: unknown } };

export type PagedList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type InventoryItemDto = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  itemType: ItemType;
  categoryId: string;
  categoryName: string;
  unit: Unit;
  minStockLevel: string;
  isActive: boolean;
  currentReferenceProfile: IngredientReferenceProfileDto | null;
  referenceProfiles: IngredientReferenceProfileDto[];
};

export type IngredientReferenceProfileDto = {
  id: string;
  costReferenceQuantity: string;
  costReferenceUnit: Unit;
  costReferenceValue: string;
  calorieReferenceQuantity: string;
  calorieReferenceUnit: Unit;
  calorieValue: string;
  normalizedCost: string;
  normalizedCalories: string;
  effectiveAt: string;
  archivedAt: string | null;
};

export type WarehouseDto = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

export type InventoryCategoryDto = {
  id: string;
  name: string;
  description: string | null;
};

export type BalanceDto = {
  id: string;
  itemId: string;
  itemCode: string;
  nameAr: string;
  nameEn: string;
  itemType: ItemType;
  categoryName: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  currentQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  minStockLevel: string;
  unit: Unit;
  needsReconciliation: boolean;
  isLowStock: boolean;
  isNegativeStock: boolean;
};

export type MovementDto = {
  id: string;
  timestamp: string;
  userName: string;
  warehouseName: string;
  itemCode: string;
  itemName: string;
  unit: Unit;
  quantityDelta: string;
  movementType: MovementType;
  sourceRefId: string | null;
  sourceType: "production" | "transfer" | "adjustment" | "waste" | "purchase" | "return" | "unknown";
};

export type TransferResultDto = { id: string };
export type AdjustmentResultDto = { id: string; newQuantity: string };
export type WasteResultDto = { id: string; newQuantity: string };

export type CreateItemInput = {
  code: string;
  nameAr: string;
  nameEn: string;
  itemType: ItemType;
  categoryId: string;
  unit: Unit;
  minStockLevel?: number | string;
};

export type UpdateItemInput = Partial<CreateItemInput> & { isActive?: boolean };

export type CreateWarehouseInput = {
  code: string;
  name: string;
  description?: string | null;
};

export type TransferInput = {
  itemId: string;
  sourceWhId: string;
  destWhId: string;
  quantity: number | string;
  notes?: string | null;
};

export type AdjustmentInput = {
  warehouseId: string;
  inventoryItemId: string;
  quantityDelta: number | string;
  reason: AdjustmentReason;
  notes?: string | null;
};

export type WasteInput = {
  warehouseId: string;
  inventoryItemId: string;
  quantity: number | string;
  reason: string;
  notes?: string | null;
};

export type BalanceFilters = {
  warehouseId?: string;
  search?: string;
  itemType?: ItemType;
  lowStockOnly?: boolean;
  needsReconciliationOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type MovementFilters = {
  inventoryItemId?: string;
  itemSearch?: string;
  warehouseId?: string;
  movementType?: MovementType;
  movementTypes?: MovementType[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  pageSize?: number;
};
