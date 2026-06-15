# Data Model & Schema Design: Reports & Analytics

This document defines the Prisma schema additions and PostgreSQL database views required to support the Reports & Analytics module.

---

## 1. New Database Tables

Two new tables are introduced to support scheduled report configurations and archived downloads.

```prisma
// Scheduled report configurations managed by Administrators
model ScheduledReport {
  id           String        @id @default(cuid())
  name         String
  reportType   String        // e.g. "PRODUCTION", "INVENTORY", "BATCH", "WASTE", "WAREHOUSE", "STAFF", "AUDIT"
  frequency    String        // e.g. "DAILY", "WEEKLY", "MONTHLY"
  format       String        // e.g. "EXCEL", "PDF", "BOTH"
  recipients   String[]      // List of email addresses or user IDs (stored for future use)
  filters      Json          // Applied search filters stored as JSON
  isActive     Boolean       @default(true)
  
  createdById  String
  createdBy    User          @relation(fields: [createdById], references: [id])
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  archives     ReportArchive[]

  @@map("scheduled_reports")
}

// Immutable archive of generated scheduled reports
model ReportArchive {
  id                String           @id @default(cuid())
  scheduledReportId String?
  scheduledReport   ScheduledReport? @relation(fields: [scheduledReportId], references: [id], onDelete: SetNull)
  name              String           // Filename e.g., "Production_Summary_2026-06-15.xlsx"
  format            String           // "EXCEL" or "PDF"
  fileUrl           String           // Path in Supabase storage bucket
  sizeBytes         Int
  generatedAt       DateTime         @default(now())

  @@map("report_archives")
}
```

---

## 2. PostgreSQL Reporting Views

To optimize report generation and avoid heavy JavaScript mapping, we define five database views. In Prisma, these can be queried using raw SQL (`$queryRaw`) or mapped as read-only models.

### View 1: `production_summary_view`
Aggregates production order statistics.

```sql
CREATE VIEW production_summary_view AS
SELECT
  COUNT(id) AS total_orders,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_orders,
  COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) AS cancelled_orders,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_completion_seconds,
  SUM(produced_quantity) AS total_produced_qty
FROM production_orders;
```

### View 2: `inventory_summary_view`
Aggregates inventory items levels, available stocks, and movements.

```sql
CREATE VIEW inventory_summary_view AS
SELECT
  ii.id AS item_id,
  ii.name AS item_name,
  ii.min_quantity AS min_qty,
  COALESCE(SUM(ib.quantity), 0) AS current_qty,
  COALESCE(SUM(ib.quantity) - SUM(ib.reserved_quantity), 0) AS available_qty
FROM inventory_items ii
LEFT JOIN inventory_balances ib ON ii.id = ib.item_id
GROUP BY ii.id, ii.name, ii.min_quantity;
```

### View 3: `batch_summary_view`
Aggregates active, expired, near-expiry, and disposed batches.

```sql
CREATE VIEW batch_summary_view AS
SELECT
  status,
  COUNT(id) AS batch_count,
  SUM(produced_quantity) AS total_quantity,
  COUNT(CASE WHEN expiry_date < NOW() AND status = 'ACTIVE' THEN 1 END) AS expired_active_count,
  COUNT(CASE WHEN expiry_date >= NOW() AND expiry_date <= NOW() + INTERVAL '7 days' AND status = 'ACTIVE' THEN 1 END) AS near_expiry_count
FROM production_batches
GROUP BY status;
```

### View 4: `waste_summary_view`
Aggregates waste logs by item and reason.

```sql
CREATE VIEW waste_summary_view AS
SELECT
  reason,
  COUNT(id) AS occurrences,
  SUM(quantity) AS total_quantity_wasted
FROM inventory_waste_records
GROUP BY reason;
```

### View 5: `staff_performance_view`
Aggregates production output and speed per individual kitchen operator.

```sql
CREATE VIEW staff_performance_view AS
SELECT
  u.id AS user_id,
  u.display_name AS staff_name,
  COUNT(po.id) AS orders_completed,
  COUNT(CASE WHEN po.status = 'CANCELLED' THEN 1 END) AS orders_cancelled,
  AVG(EXTRACT(EPOCH FROM (po.completed_at - po.started_at))) AS avg_completion_seconds,
  SUM(po.produced_quantity) AS total_produced_qty,
  COUNT(w.id) AS waste_events_count
FROM users u
LEFT JOIN production_orders po ON po.operator_id = u.id AND po.status = 'COMPLETED'
LEFT JOIN inventory_waste_records w ON w.reported_by_id = u.id
GROUP BY u.id, u.display_name;
```

---

## 3. Query Optimization & Indexes

To keep report generation under 5 seconds, indexes are required on the foreign keys and filter fields of core tables:
- `CREATE INDEX idx_production_orders_date ON production_orders (created_at, status);`
- `CREATE INDEX idx_inventory_movements_item ON inventory_movements (item_id, warehouse_id, created_at);`
- `CREATE INDEX idx_production_batches_expiry ON production_batches (expiry_date, status);`
- `CREATE INDEX idx_waste_records_item ON inventory_waste_records (item_id, reason, created_at);`
- `CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at);`
