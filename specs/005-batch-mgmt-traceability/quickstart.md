# Quickstart Validation Guide: Batch Management & Traceability

This guide provides runnable manual and automated validation scenarios to verify that the batch management, QR code, and label printing module behaves correctly according to specification.

---

## Prerequisites

1. Ensure the database migrations are applied and the seed script has run.
2. A test user with roles `Production Staff`, `Warehouse Staff`, `Supervisor`, and `Admin` must be available in the system.
3. A recipe with `shelfLifeValue = 7` (Days) and `storageMethod = REFRIGERATOR` must be configured.
4. A production order for that recipe in `IN_PROGRESS` status must exist.

---

## Validation Scenarios

### Scenario 1: Complete Production Order & Automatic Batch Generation

**Purpose**: Verify that marking a production order as completed generates a unique, sequential batch with calculated expiry and generated QR.

1. Log in as a kitchen staff member.
2. Navigate to the Production Orders queue.
3. Select an active `IN_PROGRESS` production order.
4. Click **Complete Order** and enter:
   * Produced Quantity: `15.000`
   * Unit: `KG`
   * Storage Warehouse: `WH-MAIN` (or any active warehouse ID)
5. Click **Submit**.
6. **Verification**:
   * The production order status changes to `COMPLETED`.
   * A new batch record is created. Search for it under **Batches**.
   * Verify that the Batch ID follows the format `B-2026-NNNNN` (sequential).
   * Verify that the Expiry Date is exactly 7 days after the production date (calculated from the recipe's shelf-life).
   * Verify that a `BatchQrCode` record exists in the database.

---

### Scenario 2: Label Template Selection & Reprint Audit Logging

**Purpose**: Verify that multiple label layouts are available and reprinting a label prompts for a reason and writes to audit logs.

1. Navigate to **Batches** and select the batch generated in Scenario 1.
2. Click **Print Label**.
3. Choose the **Standard Label (100mm x 50mm)** template.
4. Click **Preview** and check that all required fields (Product Name, Batch ID, Dates, Quantity, Unit, QR Code) are visible.
5. Click **Print** (opens standard browser print dialog).
6. Now, click **Reprint Label**.
7. **Verification**:
   * The system must prompt you to select a reason or enter a custom reason.
   * Enter: `"Damaged during packaging"` and click **Proceed**.
   * Run a query on the database or view the batch history tab: verify that a new entry in `BatchPrintHistory` has been created with `isReprint = true` and `reprintReason = "Damaged during packaging"`.

---

### Scenario 3: QR Code Gated Scan Verification

**Purpose**: Verify that scanning a QR code is fully gated by authentication and RBAC permissions.

1. Scan the generated QR code or copy the batch's target URL (e.g., `/inventory/batches/traceability/B-2026-00001`).
2. Open the URL in an **Incognito Window** (unauthenticated).
3. **Verification**:
   * You must be redirected to the login page (`/login`). No batch information is visible.
4. Log in as a **Warehouse Staff** member and access the URL.
5. **Verification**:
   * You can see the Batch Number, Product, Expiry Date, Quantity, and Storage Location.
   * Internal recipe details, production staff names, and audit history must be hidden/omitted.
6. Log in as a **Supervisor** or **Admin** and access the URL.
7. **Verification**:
   * All fields, including recipe version snapshot, production staff list, uploaded evidence, and inventory history, must be visible.

---

### Scenario 4: Batch Disposal & Stock Adjustment

**Purpose**: Verify that disposing of a batch reduces inventory levels and logs a disposal audit record.

1. Log in as a **Supervisor**.
2. Navigate to the Batch Detail view.
3. Click **Dispose Batch**.
4. Enter:
   * Quantity to Dispose: `5.000`
   * Reason: `QUALITY_ISSUE`
   * Notes: `"Failed temperature check during audit"`
5. Click **Submit**.
6. **Verification**:
   * Verify that the batch's remaining available quantity is now `10.000 KG` (reduced from `15.000 KG`).
   * A record in `BatchDisposal` is created containing the quantity, supervisor name, reason, and notes.
   * Query the `inventory_balances` table: verify that the stock balance for the finished product in `WH-MAIN` has decreased by `5.000 KG`.
   * Check `inventory_movements`: verify that a `WASTE` type movement has been appended to the ledger.
