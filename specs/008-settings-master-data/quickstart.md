# Quickstart & Verification Guide: Settings and Master Data

This guide describes manual scenarios to verify settings, master data CRUD operations, soft-archiving rules, role permissions, and audit log tracking.

---

## Prerequisites
- Database is up-to-date with Prisma migrations (`npx prisma migrate dev`).
- Seeds are loaded to initialize the administrative user roles (`npx prisma db seed`).
- Test accounts:
  - **Administrator**: User with `Admin` or `System Manager` role.
  - **Supervisor**: User with `Supervisor` role.
  - **Warehouse Staff**: User with `Warehouse Staff` role.

---

## Scenario 1: Creating and localizing Master Data (Admin)
1. Log in as an **Administrator**.
2. Navigate to the Master Data configuration page: `/admin/settings/warehouses`.
3. Click "Add Warehouse".
4. Fill in the localized details:
   - Code: `WH-COLD-2`
   - Name (English): `Cold Room 2`
   - Name (Arabic): `غرفة التبريد 2`
   - Description: `Secondary storage freezer`
   - Status: Checked (Active)
5. Click "Save".
6. **Validation**:
   - Verify the warehouse is saved successfully in under 2 seconds.
   - Verify it appears in the warehouses table list.
   - Change your user interface language preference to Arabic, reload the page, and verify the Arabic name `غرفة التبريد 2` is rendered.

---

## Scenario 2: Soft Archiving and Referential Integrity
1. Log in as an **Administrator**.
2. Navigate to `/admin/settings/warehouses`.
3. Locate the warehouse `WH-COLD-2` created in Scenario 1.
4. Click the "Archive" action button and confirm the modal warning.
5. **Validation**:
   - The warehouse status indicator updates to "Archived".
   - Navigate to the Inventory Transfer page (`/inventory/transfer`). Open the source/destination warehouse selection dropdowns. Verify that `Cold Room 2` is **NOT** listed in the active selection options.
   - Verify that any past transfer ledger logs involving `Cold Room 2` still correctly display the name and details of the warehouse (database references remain unbroken).

---

## Scenario 3: Modifying System Preferences & Settings
1. Log in as an **Administrator**.
2. Navigate to the Preferences page: `/admin/settings`.
3. Locate the Notification Thresholds section:
   - Change the "Low Stock Threshold (%)" from `10` to `15`.
4. Click "Save Preferences".
5. **Validation**:
   - Page displays a success toast.
   - Reload the preferences page and confirm the value is persisted as `15`.
   - Verify that subsequent stock dashboard widgets highlight item alerts at the new `15%` safety margin.

---

## Scenario 4: Audit Trail Integrity Check
1. Log in as an **Administrator** or **Supervisor**.
2. Navigate to the Audit Log page: `/admin/settings/audit`.
3. **Validation**:
   - Verify that a row is visible showing the settings modification performed in Scenario 3.
   - Row details should show:
     - **Actor**: The Administrator's display name.
     - **Action**: `SYSTEM_SETTING_UPDATED`.
     - **Timestamp**: Time of edit.
     - **Before**: `{"lowStockThresholdPercent": 10, ...}`
     - **After**: `{"lowStockThresholdPercent": 15, ...}`
   - Verify that all rows are immutable (no edit/delete buttons exist on the audit screen).

---

## Scenario 5: Access Control Enforcement (RBAC)
1. Log in as a **Warehouse Staff** member.
2. Attempt to navigate directly to `/admin/settings`.
3. **Validation**:
   - The application middleware redirects the user to the unauthorized dashboard or displays an access-denied error page.
4. Log in as a **Supervisor**.
5. Navigate to `/admin/settings`.
6. **Validation**:
   - Verify the settings and master data tables are visible (Read-Only).
   - Verify that all "Create", "Add", "Edit", "Archive", and "Save" buttons are either hidden or disabled in the UI.
   - Verify that if the user manually triggers a Server Action (e.g. using browser dev consoles), the action returns an authorization error.
