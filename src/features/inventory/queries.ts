import { Prisma, type ItemType, type MovementType } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { BalanceDto, BalanceFilters, InventoryItemDto, MovementDto, MovementFilters, PagedList, WarehouseDto } from "./types";

function decimalToString(value: Prisma.Decimal | null | undefined) {
  return value == null ? "0" : value.toString();
}

function pageInput(page?: number, pageSize?: number) {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(100, Math.max(1, pageSize ?? 50));
  return { page: safePage, pageSize: safePageSize, skip: (safePage - 1) * safePageSize };
}

function toWarehouseDto(warehouse: { id: string; code: string; name: string; description: string | null; isActive: boolean }): WarehouseDto {
  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    description: warehouse.description,
    isActive: warehouse.isActive
  };
}

export async function getWarehouses(activeOnly = true): Promise<WarehouseDto[]> {
  await getServerSession();
  const warehouses = await prisma.warehouse.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: [{ name: "asc" }]
  });
  return warehouses.map(toWarehouseDto);
}

export async function getInventoryCategories() {
  await getServerSession();
  const categories = await prisma.inventoryCategory.findMany({ orderBy: { name: "asc" } });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description
  }));
}

export async function getInventoryItems(filters: { type?: ItemType; categoryId?: string; isActive?: boolean; search?: string } = {}): Promise<InventoryItemDto[]> {
  await getServerSession();
  const search = filters.search?.trim();
  const items = await prisma.inventoryItem.findMany({
    where: {
      ...(filters.type ? { itemType: filters.type } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(typeof filters.isActive === "boolean" ? { isActive: filters.isActive } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { nameEn: { contains: search, mode: "insensitive" } },
              { nameAr: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { code: "asc" }]
  });
  return items.map((item) => ({
    id: item.id,
    code: item.code,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    itemType: item.itemType,
    categoryId: item.categoryId,
    categoryName: item.category.name,
    unit: item.unit,
    minStockLevel: decimalToString(item.minStockLevel),
    isActive: item.isActive
  }));
}

export async function getInventoryBalance(warehouseId: string, itemId: string) {
  await getServerSession();
  const balance = await prisma.inventoryBalance.findUnique({
    where: { warehouseId_inventoryItemId: { warehouseId, inventoryItemId: itemId } },
    include: { inventoryItem: { include: { category: true } }, warehouse: true }
  });
  if (!balance) return null;
  return toBalanceDto(balance);
}

function toBalanceDto(balance: Prisma.InventoryBalanceGetPayload<{ include: { inventoryItem: { include: { category: true } }; warehouse: true } }>): BalanceDto {
  const current = new Prisma.Decimal(balance.currentQuantity);
  const minimum = new Prisma.Decimal(balance.inventoryItem.minStockLevel);
  return {
    id: balance.id,
    itemId: balance.inventoryItemId,
    itemCode: balance.inventoryItem.code,
    nameAr: balance.inventoryItem.nameAr,
    nameEn: balance.inventoryItem.nameEn,
    itemType: balance.inventoryItem.itemType,
    categoryName: balance.inventoryItem.category.name,
    warehouseId: balance.warehouseId,
    warehouseCode: balance.warehouse.code,
    warehouseName: balance.warehouse.name,
    currentQuantity: decimalToString(balance.currentQuantity),
    reservedQuantity: decimalToString(balance.reservedQuantity),
    availableQuantity: decimalToString(balance.availableQuantity),
    minStockLevel: decimalToString(balance.inventoryItem.minStockLevel),
    unit: balance.inventoryItem.unit,
    needsReconciliation: balance.needsReconciliation,
    isLowStock: current.lt(minimum),
    isNegativeStock: current.lt(0)
  };
}

export async function getInventoryBalances(filters: BalanceFilters = {}): Promise<PagedList<BalanceDto>> {
  await getServerSession();
  const search = filters.search?.trim();
  const { page, pageSize, skip } = pageInput(filters.page, filters.pageSize);
  const where: Prisma.InventoryBalanceWhereInput = {
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.needsReconciliationOnly ? { needsReconciliation: true } : {}),
    ...(filters.itemType || search
      ? {
          inventoryItem: {
            ...(filters.itemType ? { itemType: filters.itemType } : {}),
            ...(search
              ? {
                  OR: [
                    { code: { contains: search, mode: "insensitive" } },
                    { nameEn: { contains: search, mode: "insensitive" } },
                    { nameAr: { contains: search, mode: "insensitive" } }
                  ]
                }
              : {})
          }
        }
      : {})
  };
  const [items, total] = await Promise.all([
    prisma.inventoryBalance.findMany({
      where,
      include: { inventoryItem: { include: { category: true } }, warehouse: true },
      orderBy: [{ inventoryItem: { code: "asc" } }, { warehouse: { code: "asc" } }],
      skip,
      take: pageSize
    }),
    prisma.inventoryBalance.count({ where })
  ]);
  const mapped = items.map(toBalanceDto).filter((item) => (filters.lowStockOnly ? item.isLowStock : true));
  return { items: mapped, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getInventoryBalanceOptions(): Promise<BalanceDto[]> {
  await getServerSession();
  const balances = await prisma.inventoryBalance.findMany({
    include: { inventoryItem: { include: { category: true } }, warehouse: true },
    orderBy: [{ inventoryItem: { code: "asc" } }, { warehouse: { code: "asc" } }],
    take: 1000
  });
  return balances.map(toBalanceDto);
}

export async function getStockMovementHistory(filters: MovementFilters = {}) {
  return getInventoryMovementHistory(filters);
}

function sourceTypeFor(type: MovementType): MovementDto["sourceType"] {
  if (type === "PRODUCTION_CONSUMPTION" || type === "PRODUCTION_OUTPUT") return "production";
  if (type === "TRANSFER_IN" || type === "TRANSFER_OUT") return "transfer";
  if (type === "ADJUSTMENT_INCREASE" || type === "ADJUSTMENT_DECREASE") return "adjustment";
  if (type === "WASTE") return "waste";
  if (type === "PURCHASE") return "purchase";
  if (type === "RETURN") return "return";
  return "unknown";
}

export async function getInventoryMovementHistory(filters: MovementFilters = {}): Promise<PagedList<MovementDto>> {
  await getServerSession();
  const { page, pageSize, skip } = pageInput(filters.page, filters.pageSize);
  const itemSearch = filters.itemSearch?.trim();
  const where: Prisma.StockMovementWhereInput = {
    ...(filters.inventoryItemId ? { inventoryItemId: filters.inventoryItemId } : {}),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.movementTypes?.length ? { movementType: { in: filters.movementTypes } } : filters.movementType ? { movementType: filters.movementType } : {}),
    ...(itemSearch
      ? {
          inventoryItem: {
            OR: [
              { code: { contains: itemSearch, mode: "insensitive" } },
              { nameEn: { contains: itemSearch, mode: "insensitive" } },
              { nameAr: { contains: itemSearch, mode: "insensitive" } }
            ]
          }
        }
      : {}),
    ...(filters.dateFrom || filters.dateTo
      ? {
          timestamp: {
            gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            lte: filters.dateTo ? new Date(filters.dateTo) : undefined
          }
        }
      : {})
  };
  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: { inventoryItem: true, warehouse: true, user: true },
      orderBy: { timestamp: "desc" },
      skip,
      take: pageSize
    }),
    prisma.stockMovement.count({ where })
  ]);
  return {
    items: items.map((movement) => ({
      id: movement.id,
      timestamp: movement.timestamp.toISOString(),
      userName: movement.user.displayName,
      warehouseName: movement.warehouse.name,
      itemCode: movement.inventoryItem.code,
      itemName: movement.inventoryItem.nameEn || movement.inventoryItem.nameAr,
      unit: movement.inventoryItem.unit,
      quantityDelta: decimalToString(movement.quantityDelta),
      movementType: movement.movementType,
      sourceRefId: movement.sourceRefId,
      sourceType: sourceTypeFor(movement.movementType)
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  };
}

export async function getUserWarehouseAssignments(userId: string) {
  const assignments = await prisma.userWarehouse.findMany({
    where: { userId },
    include: { warehouse: true },
    orderBy: { warehouse: { name: "asc" } }
  });
  return assignments.map((assignment) => toWarehouseDto(assignment.warehouse));
}

export async function getInventoryTransferHistory() {
  await getServerSession();
  return prisma.inventoryTransfer.findMany({
    include: { item: true, sourceWh: true, destWh: true, user: true },
    orderBy: { timestamp: "desc" },
    take: 100
  });
}

export async function getInventoryAdjustmentHistory() {
  await getServerSession();
  return prisma.inventoryAdjustment.findMany({
    include: { inventoryItem: true, warehouse: true, user: true },
    orderBy: { timestamp: "desc" },
    take: 100
  });
}

export async function getInventoryWasteHistory() {
  await getServerSession();
  return prisma.inventoryWasteRecord.findMany({
    include: { inventoryItem: true, warehouse: true, user: true },
    orderBy: { timestamp: "desc" },
    take: 100
  });
}
