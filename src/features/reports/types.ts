export type ReportType =
  | "PRODUCTION_SUMMARY"
  | "PRODUCTION_RECIPE"
  | "PRODUCTION_CATEGORY"
  | "INVENTORY_LEVELS"
  | "INVENTORY_MOVEMENTS"
  | "INVENTORY_CONSUMPTION"
  | "LOW_STOCK"
  | "ACTIVE_BATCHES"
  | "EXPIRED_BATCHES"
  | "NEAR_EXPIRY"
  | "DISPOSED_BATCHES"
  | "WASTE_SUMMARY"
  | "WASTE_ITEM"
  | "WASTE_REASON"
  | "WAREHOUSE_STOCK"
  | "WAREHOUSE_TRANSFERS"
  | "STAFF_SUMMARY"
  | "STAFF_PRODUCTION"
  | "STAFF_ACTIVITY"
  | "AUDIT_USER"
  | "AUDIT_INVENTORY"
  | "AUDIT_BATCH"
  | "RECIPE_COST_SUMMARY"
  | "RECIPE_CALORIE_SUMMARY"
  | "RECIPE_PROFITABILITY"
  | "RECIPE_COST_TREND";

export type ReportFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type ReportFormat = "EXCEL" | "PDF" | "BOTH";
export type ExportFormat = "excel" | "pdf";

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  recipeId?: string;
  categoryId?: string;
  userId?: string;
  status?: string;
  search?: string;
}

export interface DashboardKpis {
  productionToday: number;
  ordersInProgress: number;
  ordersCompletedToday: number;
  activeBatches: number;
  nearExpiryBatches: number;
  expiredBatches: number;
  lowStockItems: number;
  wasteToday: number;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface DashboardMetrics extends DashboardKpis {
  productionTrend: TrendPoint[];
  wasteTrend: TrendPoint[];
}

export type ReportRow = Record<string, string | number | boolean | null>;

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface ReportDataResult {
  rows: ReportRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  columns: ReportColumn[];
}

export interface ScheduledReportInput {
  name: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  format: ReportFormat;
  filters: ReportFilters;
  recipients?: string[];
}

export interface ScheduledReportDto extends ScheduledReportInput {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportArchiveDto {
  id: string;
  scheduledReportId: string | null;
  name: string;
  format: string;
  fileUrl: string;
  sizeBytes: number;
  generatedAt: string;
}
