# Interface Contracts: Reports & Analytics

This document defines the signatures and interface contracts for the Server Actions and HTTP export endpoints.

---

## 1. Next.js Server Actions

Server Actions reside in `src/features/reports/actions.ts` and require authenticated sessions.

### `getDashboardKPIs`
Retrieves aggregated metrics for the dashboard KPI cards.
```typescript
export async function getDashboardKPIs(filters: ReportFilters): Promise<{
  productionToday: number;
  ordersInProgress: number;
  ordersCompletedToday: number;
  activeBatches: number;
  nearExpiryBatches: number;
  expiredBatches: number;
  lowStockItems: number;
  wasteToday: number;
}>;
```

### `getReportData`
Generic action to fetch tabular report rows based on report type and applied filters.
```typescript
export type ReportType = 
  | "PRODUCTION_SUMMARY" | "PRODUCTION_RECIPE" | "PRODUCTION_CATEGORY"
  | "INVENTORY_LEVELS" | "INVENTORY_MOVEMENTS" | "INVENTORY_CONSUMPTION" | "LOW_STOCK"
  | "ACTIVE_BATCHES" | "EXPIRED_BATCHES" | "NEAR_EXPIRY" | "DISPOSED_BATCHES"
  | "WASTE_SUMMARY" | "WASTE_ITEM" | "WASTE_REASON"
  | "WAREHOUSE_STOCK" | "WAREHOUSE_TRANSFERS"
  | "STAFF_SUMMARY" | "STAFF_PRODUCTION" | "STAFF_ACTIVITY"
  | "AUDIT_USER" | "AUDIT_INVENTORY" | "AUDIT_BATCH";

export interface ReportFilters {
  startDate?: string; // ISO String
  endDate?: string;   // ISO String
  warehouseId?: string;
  recipeId?: string;
  categoryId?: string;
  userId?: string;
  status?: string;
}

export async function getReportData(
  reportType: ReportType,
  filters: ReportFilters,
  page?: number,
  limit?: number
): Promise<{
  rows: any[];
  totalCount: number;
  page: number;
  totalPages: number;
}>;
```

### `createScheduledReport`
Creates a new automated scheduled report configuration.
```typescript
export async function createScheduledReport(data: {
  name: string;
  reportType: ReportType;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  format: "EXCEL" | "PDF" | "BOTH";
  filters: ReportFilters;
}): Promise<{ success: boolean; id: string }>;
```

---

## 2. HTTP Export Endpoints (Route Handlers)

To allow browser file downloads (Excel, PDF), REST route handlers are exposed.

### `GET /api/reports/export`
Generates and downloads the filtered report file.

**Query Parameters:**
- `format`: `excel` | `pdf`
- `reportType`: (e.g. `PRODUCTION_SUMMARY`, `INVENTORY_LEVELS`, etc.)
- `filters`: Stringified JSON of `ReportFilters`

**Headers:**
- `Authorization`: Session cookie
- `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel) or `application/pdf` (PDF)

**Response:**
- `200 OK`: File stream download.
- `401 Unauthorized`: Authentication missing.
- `403 Forbidden`: Insufficient permissions (RBAC check failed).
- `400 Bad Request`: Missing format or invalid filter payload.
