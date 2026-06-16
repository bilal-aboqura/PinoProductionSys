import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type {
  DashboardMetrics,
  ReportArchiveDto,
  ReportColumn,
  ReportDataResult,
  ReportFilters,
  ReportRow,
  ReportType,
  ScheduledReportDto,
  TrendPoint
} from "./types";

type DateField = "createdAt" | "timestamp" | "productionDate" | "expiryDate" | "completedAt";

export function toNumber(value: Prisma.Decimal | number | bigint | null | undefined) {
  if (value == null) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function pageInput(page?: number, limit?: number) {
  const safePage = Math.max(1, page ?? 1);
  const pageSize = Math.min(100, Math.max(1, limit ?? 50));
  return { page: safePage, pageSize, skip: (safePage - 1) * pageSize };
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

function filterDateRange(filters: ReportFilters, field: DateField) {
  if (!filters.startDate && !filters.endDate) return {};
  return {
    [field]: {
      gte: filters.startDate ? new Date(filters.startDate) : undefined,
      lte: filters.endDate ? new Date(filters.endDate) : undefined
    }
  };
}

function serialize(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function daysBack(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (count - index - 1));
    return date;
  });
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

async function getLowStockCount() {
  const balances = await prisma.inventoryBalance.findMany({
    include: { inventoryItem: true },
    where: { inventoryItem: { isActive: true } }
  });
  return balances.filter((balance) => new Prisma.Decimal(balance.currentQuantity).lt(balance.inventoryItem.minStockLevel)).length;
}

export async function getDashboardMetrics(filters: ReportFilters = {}): Promise<DashboardMetrics> {
  await getServerSession();
  const today = todayRange();
  const sevenDays = daysBack(7);
  const trendStart = sevenDays[0];

  const productionToday = await prisma.productionOrder.count({ where: { createdAt: today } });
  const ordersInProgress = await prisma.productionOrder.count({ where: { status: "IN_PROGRESS" } });
  const ordersCompletedToday = await prisma.productionOrder.count({ where: { status: "COMPLETED", completedAt: today } });
  const activeBatches = await prisma.productionBatch.count({ where: { status: "ACTIVE" } });
  const nearExpiryBatches = await prisma.productionBatch.count({
    where: {
      status: "ACTIVE",
      expiryDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    }
  });
  const expiredBatches = await prisma.productionBatch.count({ where: { status: "ACTIVE", expiryDate: { lt: new Date() } } });
  const lowStockItems = await getLowStockCount();
  const wasteToday = await prisma.inventoryWasteRecord.aggregate({ _sum: { quantity: true }, where: { timestamp: today } });
  const recentOrders = await prisma.productionOrder.findMany({
    where: { createdAt: { gte: trendStart }, ...filterDateRange(filters, "createdAt") },
    select: { createdAt: true, producedQuantity: true },
    take: 500
  });
  const recentWaste = await prisma.inventoryWasteRecord.findMany({
    where: { timestamp: { gte: trendStart }, ...filterDateRange(filters, "timestamp") },
    select: { timestamp: true, quantity: true },
    take: 500
  });

  const productionTrend = trendFromRows(
    sevenDays,
    recentOrders.map((order) => ({ date: order.createdAt, value: toNumber(order.producedQuantity) || 1 }))
  );
  const wasteTrend = trendFromRows(
    sevenDays,
    recentWaste.map((waste) => ({ date: waste.timestamp, value: toNumber(waste.quantity) }))
  );

  return {
    productionToday,
    ordersInProgress,
    ordersCompletedToday,
    activeBatches,
    nearExpiryBatches,
    expiredBatches,
    lowStockItems,
    wasteToday: toNumber(wasteToday._sum.quantity),
    productionTrend,
    wasteTrend
  };
}

export function trendFromRows(days: Date[], rows: { date: Date; value: number }[]): TrendPoint[] {
  return days.map((day) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const value = rows
      .filter((row) => row.date >= day && row.date < next)
      .reduce((sum, row) => sum + row.value, 0);
    return { label: dayLabel(day), value };
  });
}

const commonColumns: Record<string, ReportColumn[]> = {
  production: [
    { key: "orderNumber", label: "Order" },
    { key: "recipe", label: "Recipe" },
    { key: "status", label: "Status" },
    { key: "quantity", label: "Quantity", align: "right" },
    { key: "createdAt", label: "Created" }
  ],
  inventory: [
    { key: "itemCode", label: "Code" },
    { key: "itemName", label: "Item" },
    { key: "warehouse", label: "Warehouse" },
    { key: "currentQuantity", label: "Current", align: "right" },
    { key: "availableQuantity", label: "Available", align: "right" },
    { key: "status", label: "Status" }
  ],
  batches: [
    { key: "batchNumber", label: "Batch" },
    { key: "recipe", label: "Recipe" },
    { key: "warehouse", label: "Warehouse" },
    { key: "status", label: "Status" },
    { key: "remainingQuantity", label: "Remaining", align: "right" },
    { key: "expiryDate", label: "Expiry" }
  ],
  waste: [
    { key: "itemName", label: "Item" },
    { key: "warehouse", label: "Warehouse" },
    { key: "reason", label: "Reason" },
    { key: "quantity", label: "Quantity", align: "right" },
    { key: "timestamp", label: "Time" }
  ],
  staff: [
    { key: "staffName", label: "Staff" },
    { key: "ordersCompleted", label: "Completed", align: "right" },
    { key: "ordersCancelled", label: "Cancelled", align: "right" },
    { key: "avgCompletionMinutes", label: "Avg Min", align: "right" },
    { key: "wasteEvents", label: "Waste Events", align: "right" }
  ]
};

export function columnsForReport(reportType: ReportType): ReportColumn[] {
  if (reportType.startsWith("INVENTORY") || reportType === "LOW_STOCK" || reportType.startsWith("WAREHOUSE")) return commonColumns.inventory;
  if (reportType.includes("BATCH") || reportType === "ACTIVE_BATCHES" || reportType === "EXPIRED_BATCHES" || reportType === "NEAR_EXPIRY" || reportType === "DISPOSED_BATCHES") {
    return commonColumns.batches;
  }
  if (reportType.startsWith("WASTE")) return commonColumns.waste;
  if (reportType.startsWith("STAFF")) return commonColumns.staff;
  if (reportType.startsWith("AUDIT")) {
    return [
      { key: "actorName", label: "Actor" },
      { key: "action", label: "Action" },
      { key: "targetName", label: "Target" },
      { key: "createdAt", label: "Time" }
    ];
  }
  return commonColumns.production;
}

export async function getReportRows(reportType: ReportType, filters: ReportFilters = {}, page?: number, limit?: number): Promise<ReportDataResult> {
  await getServerSession();
  if (reportType.startsWith("INVENTORY") || reportType === "LOW_STOCK" || reportType.startsWith("WAREHOUSE")) {
    return getInventoryReport(reportType, filters, page, limit);
  }
  if (reportType.includes("BATCH") || reportType === "ACTIVE_BATCHES" || reportType === "EXPIRED_BATCHES" || reportType === "NEAR_EXPIRY" || reportType === "DISPOSED_BATCHES") {
    return getBatchReport(reportType, filters, page, limit);
  }
  if (reportType.startsWith("WASTE")) return getWasteReport(filters, page, limit);
  if (reportType.startsWith("STAFF")) return getStaffReport(filters, page, limit);
  if (reportType.startsWith("AUDIT")) return getAuditReport(filters, page, limit);
  return getProductionReport(filters, page, limit);
}

async function getProductionReport(filters: ReportFilters, page?: number, limit?: number): Promise<ReportDataResult> {
  const { page: safePage, pageSize, skip } = pageInput(page, limit);
  const search = filters.search?.trim();
  const where: Prisma.ProductionOrderWhereInput = {
    ...filterDateRange(filters, "createdAt"),
    ...(filters.status ? { status: filters.status as Prisma.ProductionOrderWhereInput["status"] } : {}),
    ...(filters.recipeId ? { recipeId: filters.recipeId } : {}),
    ...(search ? { OR: [{ orderNumber: { contains: search, mode: "insensitive" } }, { recipeNameSnapshot: { contains: search, mode: "insensitive" } }] } : {})
  };
  const orders = await prisma.productionOrder.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize });
  const total = await prisma.productionOrder.count({ where });
  return {
    rows: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      recipe: order.recipeNameSnapshot,
      status: order.status,
      quantity: serialize(order.producedQuantity ?? order.targetQuantity),
      createdAt: order.createdAt.toISOString()
    })),
    totalCount: total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    columns: columnsForReport("PRODUCTION_SUMMARY")
  };
}

async function getInventoryReport(reportType: ReportType, filters: ReportFilters, page?: number, limit?: number): Promise<ReportDataResult> {
  const { page: safePage, pageSize, skip } = pageInput(page, limit);
  const search = filters.search?.trim();
  const where: Prisma.InventoryBalanceWhereInput = {
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(search
      ? {
          inventoryItem: {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { nameEn: { contains: search, mode: "insensitive" } },
              { nameAr: { contains: search, mode: "insensitive" } }
            ]
          }
        }
      : {})
  };
  const balances = await prisma.inventoryBalance.findMany({
    where,
    include: { inventoryItem: true, warehouse: true },
    orderBy: [{ inventoryItem: { code: "asc" } }, { warehouse: { code: "asc" } }],
    skip,
    take: pageSize
  });
  const total = await prisma.inventoryBalance.count({ where });
  const rows = balances
    .map((balance) => {
      const isLow = new Prisma.Decimal(balance.currentQuantity).lt(balance.inventoryItem.minStockLevel);
      return {
        id: balance.id,
        itemCode: balance.inventoryItem.code,
        itemName: balance.inventoryItem.nameEn || balance.inventoryItem.nameAr,
        warehouse: balance.warehouse.name,
        currentQuantity: serialize(balance.currentQuantity),
        availableQuantity: serialize(balance.availableQuantity),
        status: isLow ? "LOW_STOCK" : "OK"
      };
    })
    .filter((row) => (reportType === "LOW_STOCK" ? row.status === "LOW_STOCK" : true));
  return { rows, totalCount: total, page: safePage, totalPages: Math.max(1, Math.ceil(total / pageSize)), columns: columnsForReport(reportType) };
}

async function getBatchReport(reportType: ReportType, filters: ReportFilters, page?: number, limit?: number): Promise<ReportDataResult> {
  const { page: safePage, pageSize, skip } = pageInput(page, limit);
  const now = new Date();
  const where: Prisma.ProductionBatchWhereInput = {
    ...filterDateRange(filters, "productionDate"),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.status ? { status: filters.status as Prisma.ProductionBatchWhereInput["status"] } : {}),
    ...(reportType === "ACTIVE_BATCHES" ? { status: "ACTIVE" } : {}),
    ...(reportType === "DISPOSED_BATCHES" ? { status: "DISPOSED" } : {}),
    ...(reportType === "EXPIRED_BATCHES" ? { expiryDate: { lt: now } } : {}),
    ...(reportType === "NEAR_EXPIRY" ? { status: "ACTIVE", expiryDate: { gte: now, lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } } : {}),
    ...(filters.search ? { batchNumber: { contains: filters.search, mode: "insensitive" } } : {})
  };
  const batches = await prisma.productionBatch.findMany({
    where,
    include: { recipe: true, warehouse: true },
    orderBy: { expiryDate: "asc" },
    skip,
    take: pageSize
  });
  const total = await prisma.productionBatch.count({ where });
  return {
    rows: batches.map((batch) => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      recipe: batch.recipe.nameEn || batch.recipe.nameAr,
      warehouse: batch.warehouse.name,
      status: batch.status,
      remainingQuantity: serialize(batch.remainingQuantity),
      expiryDate: batch.expiryDate.toISOString()
    })),
    totalCount: total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    columns: columnsForReport(reportType)
  };
}

async function getWasteReport(filters: ReportFilters, page?: number, limit?: number): Promise<ReportDataResult> {
  const { page: safePage, pageSize, skip } = pageInput(page, limit);
  const where: Prisma.InventoryWasteRecordWhereInput = {
    ...filterDateRange(filters, "timestamp"),
    ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
    ...(filters.status ? { reason: filters.status as Prisma.InventoryWasteRecordWhereInput["reason"] } : {})
  };
  const records = await prisma.inventoryWasteRecord.findMany({
    where,
    include: { inventoryItem: true, warehouse: true },
    orderBy: { timestamp: "desc" },
    skip,
    take: pageSize
  });
  const total = await prisma.inventoryWasteRecord.count({ where });
  return {
    rows: records.map((record) => ({
      id: record.id,
      itemName: record.inventoryItem.nameEn || record.inventoryItem.nameAr,
      warehouse: record.warehouse.name,
      reason: record.reason,
      quantity: serialize(record.quantity),
      timestamp: record.timestamp.toISOString()
    })),
    totalCount: total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    columns: columnsForReport("WASTE_SUMMARY")
  };
}

async function getStaffReport(filters: ReportFilters, page?: number, limit?: number): Promise<ReportDataResult> {
  const { page: safePage, pageSize, skip } = pageInput(page, limit);
  const users = await prisma.user.findMany({
    where: { ...(filters.userId ? { id: filters.userId } : {}), ...(filters.search ? { displayName: { contains: filters.search, mode: "insensitive" } } : {}) },
    orderBy: { displayName: "asc" },
    skip,
    take: pageSize
  });
  const rows = [];
  for (const user of users) {
      const ordersCompleted = await prisma.productionOrder.count({ where: { completedById: user.id, status: "COMPLETED", ...filterDateRange(filters, "completedAt") } });
      const ordersCancelled = await prisma.productionOrder.count({ where: { cancelledById: user.id, status: "CANCELLED", ...filterDateRange(filters, "createdAt") } });
      const completedOrders = await prisma.productionOrder.findMany({
        where: { completedById: user.id, status: "COMPLETED", completedAt: { not: null } },
        select: { durationSeconds: true },
        take: 200
      });
      const wasteEvents = await prisma.inventoryWasteRecord.count({ where: { userId: user.id, ...filterDateRange(filters, "timestamp") } });
      const avgSeconds = completedOrders.length
        ? completedOrders.reduce((sum, order) => sum + (order.durationSeconds ?? 0), 0) / completedOrders.length
        : 0;
      rows.push({
        id: user.id,
        staffName: user.displayName,
        ordersCompleted,
        ordersCancelled,
        avgCompletionMinutes: Math.round(avgSeconds / 60),
        wasteEvents
      });
  }
  const total = await prisma.user.count({ where: filters.userId ? { id: filters.userId } : {} });
  return { rows, totalCount: total, page: safePage, totalPages: Math.max(1, Math.ceil(total / pageSize)), columns: columnsForReport("STAFF_SUMMARY") };
}

async function getAuditReport(filters: ReportFilters, page?: number, limit?: number): Promise<ReportDataResult> {
  const { page: safePage, pageSize, skip } = pageInput(page, limit);
  const where: Prisma.AuditLogWhereInput = {
    ...filterDateRange(filters, "createdAt"),
    ...(filters.userId ? { actorId: filters.userId } : {}),
    ...(filters.search ? { OR: [{ actorName: { contains: filters.search, mode: "insensitive" } }, { targetName: { contains: filters.search, mode: "insensitive" } }] } : {})
  };
  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize });
  const total = await prisma.auditLog.count({ where });
  return {
    rows: logs.map((log) => ({
      id: log.id,
      actorName: log.actorName,
      action: log.action,
      targetName: log.targetName,
      createdAt: log.createdAt.toISOString()
    })),
    totalCount: total,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    columns: columnsForReport("AUDIT_USER")
  };
}

export async function getBatchTimeline(search: string) {
  await getServerSession();
  const batch = await prisma.productionBatch.findFirst({
    where: { batchNumber: { contains: search.trim(), mode: "insensitive" } },
    include: {
      recipe: true,
      warehouse: true,
      statusHistory: { include: { changedBy: true }, orderBy: { changedAt: "asc" } },
      printHistory: { include: { printedBy: true }, orderBy: { printedAt: "asc" } },
      disposals: { include: { disposedBy: true }, orderBy: { disposedAt: "asc" } }
    }
  });
  if (!batch) return null;
  return {
    batchNumber: batch.batchNumber,
    recipe: batch.recipe.nameEn || batch.recipe.nameAr,
    warehouse: batch.warehouse.name,
    status: batch.status,
    events: [
      { at: batch.createdAt.toISOString(), type: "CREATED", actor: "System", detail: "Batch created" },
      ...batch.statusHistory.map((event) => ({
        at: event.changedAt.toISOString(),
        type: "STATUS",
        actor: event.changedBy.displayName,
        detail: `${event.fromStatus ?? "NEW"} -> ${event.toStatus}`
      })),
      ...batch.printHistory.map((event) => ({
        at: event.printedAt.toISOString(),
        type: event.isReprint ? "REPRINT" : "PRINT",
        actor: event.printedBy.displayName,
        detail: event.reprintReason ?? event.labelTemplate
      })),
      ...batch.disposals.map((event) => ({
        at: event.disposedAt.toISOString(),
        type: "DISPOSAL",
        actor: event.disposedBy.displayName,
        detail: `${event.reason} (${event.quantityDisposed.toString()})`
      }))
    ].sort((a, b) => a.at.localeCompare(b.at))
  };
}

export async function listScheduledReports(): Promise<ScheduledReportDto[]> {
  await getServerSession();
  const reports = await prisma.scheduledReport.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });
  return reports.map((report) => ({
    id: report.id,
    name: report.name,
    reportType: report.reportType as ScheduledReportDto["reportType"],
    frequency: report.frequency as ScheduledReportDto["frequency"],
    format: report.format as ScheduledReportDto["format"],
    recipients: report.recipients,
    filters: report.filters as ScheduledReportDto["filters"],
    isActive: report.isActive,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString()
  }));
}

export async function listReportArchives(): Promise<ReportArchiveDto[]> {
  await getServerSession();
  const archives = await prisma.reportArchive.findMany({ orderBy: { generatedAt: "desc" }, take: 100 });
  return archives.map((archive) => ({
    id: archive.id,
    scheduledReportId: archive.scheduledReportId,
    name: archive.name,
    format: archive.format,
    fileUrl: archive.fileUrl,
    sizeBytes: archive.sizeBytes,
    generatedAt: archive.generatedAt.toISOString()
  }));
}

export function rowsForExport(result: ReportDataResult): ReportRow[] {
  return result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column) => [column.label, serialize(row[column.key])])) as ReportRow
  );
}
