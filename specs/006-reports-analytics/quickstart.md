# Validation Guide: Reports & Analytics Quickstart

This document describes the validation scenarios and test instructions to verify the technical implementation of the Reports & Analytics module.

---

## 1. Setup & Prerequisites

Before validating, ensure that:
1. The database views defined in the [Data Model](data-model.md) have been created in the database.
2. The seed script has run successfully (`npm run db:seed`) to populate users, roles, permissions, recipes, orders, inventory items, and audit logs.

---

## 2. Validation Scenarios

### Scenario 1: Dashboard KPIs Generation
- **Goal**: Verify dashboard KPIs load accurately and quickly.
- **Action**:
  1. Log in as an Administrator (`admin`).
  2. Navigate to the Reports page (`/reports`).
  3. Verify that all 8 KPI cards (Production Today, Orders In Progress, Orders Completed, Active Batches, Near Expiry, Expired Batches, Low Stock, Waste Today) show numeric data.
- **Expected Outcome**: KPI cards render in under 2 seconds. The numbers match database aggregates.

### Scenario 2: Granular Report Filtering
- **Goal**: Verify report filtering restricts records dynamically.
- **Action**:
  1. Go to the Batch Report tab (`/reports/batches`).
  2. Select Date Range (last 7 days), Status (ACTIVE), and Warehouse (Central Warehouse).
  3. Click "Apply Filters".
- **Expected Outcome**: Tabular records reload within 500ms. All visible rows have status `ACTIVE` and are located in the chosen warehouse.

### Scenario 3: Excel (.xlsx) Export
- **Goal**: Validate Excel file formatting and content correctness.
- **Action**:
  1. In the Production Summary Report, click "Export to Excel".
  2. Save and open the generated `.xlsx` file.
- **Expected Outcome**:
  - The download completes in under 10 seconds.
  - The workbook includes a header block detailing the applied filters, user email, and time of export.
  - Row cells match UI table data exactly.

### Scenario 4: PDF Export Generation
- **Goal**: Validate PDF print layout and page styling.
- **Action**:
  1. In the Inventory Levels Report, click "Export to PDF".
  2. Open the downloaded `.pdf` file.
- **Expected Outcome**:
  - The PDF has a professional header layout (Pino Production brand color matching `#A14323`).
  - Table columns align correctly and text does not wrap or overflow page boundaries.
  - Page numbers (e.g. "Page 1 of 3") render in the footer.

### Scenario 5: RBAC Role-Gating Enforcement
- **Goal**: Verify unauthorized roles cannot query reports.
- **Action**:
  1. Log in as a kitchen operator (Production Staff).
  2. Attempt to fetch staff performance analytics by triggering `getReportData("STAFF_SUMMARY")` via API console or browsing.
- **Expected Outcome**: Access is denied. The API returns `403 Forbidden` and the page renders the `AccessDenied` view.
