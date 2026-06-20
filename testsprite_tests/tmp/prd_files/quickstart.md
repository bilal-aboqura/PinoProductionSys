# Quickstart & Verification Guide: Printing and Device Integration

This guide describes manual verification steps to validate printer configurations, print-ready layout scaling, scanner emulations, and reprint tracking rules.

---

## Prerequisites
- Database schema migrations are applied (`npx prisma migrate dev`).
- Seeds are run to populate default label templates (50x50mm, 100x50mm, 100x100mm) and test printer records.
- Standard physical printer or thermal printer connected to the client PC (or configured as print-to-PDF).

---

## Scenario 1: Printer Configuration (Admin)
1. Log in as an **Administrator**.
2. Navigate to `/admin/printers`.
3. Click "Add Printer".
4. Fill in:
   - Name: `Zebra GK420t`
   - Description: `Kitchen Thermal Printer`
   - Type: `THERMAL`
   - Default: Checked
   - Status: Active
5. Click "Save".
6. **Validation**:
   - Verify the printer appears in the active list.
   - Verify that all standard print jobs default to this printer.

---

## Scenario 2: Batch Label Printing (Production Staff)
1. Log in as a **Production Operator**.
2. Navigate to a completed batch record: `/production/batches/B-20260615-001`.
3. Click "Print Batch Label".
4. A print preview modal opens. Select `Standard Label (100x50mm)` and click "Print".
5. The browser print dialog appears.
6. **Validation**:
   - Verify that the label layout renders only the product name, batch ID, dates, and the QR code. All app sidebars, buttons, and headers are hidden.
   - Verify the print scale is correct for the thermal layout.
   - Click "Print" (or save as PDF).
   - Navigate to `/printing` (Print Queue) and confirm a log row is created with status `COMPLETED`.

---

## Scenario 3: Reprint Restrictions & Auditing (Supervisor)
1. Log in as a **Production Operator** (non-supervisor).
2. Navigate to `/printing` (Print Queue) and locate the print job created in Scenario 2.
3. Attempt to click "Reprint Label".
4. **Validation**:
   - Verify that the action is disabled or redirects to an access-denied state.
5. Log out and log in as a **Supervisor** or **Administrator**.
6. Navigate to the same print job and click "Reprint Label".
7. A prompt opens requiring a reprint reason. Select `Damage` and input notes: `Damaged during labeling`. Click "Confirm Reprint".
8. The browser print dialog triggers.
9. **Validation**:
   - Open `/admin/settings/audit` or the printing history tab. Verify a `LABEL_REPRINTED` log is written, capturing the supervisor's name, timestamp, reprint reason, and the original job ID.

---

## Scenario 4: Keyboard Emulation Scanner Integration
1. Log in to the application.
2. Focus the batch/inventory search bar on any layout header or detail list page.
3. Emulate a barcode scanner scan:
   - Connect a physical USB scanner, scan a batch QR code, and verify that the code's text (e.g. `B-20260615-001`) is entered into the text field and triggers automatic form submit.
   - *Alternate manual test*: Type `B-20260615-001` and press the `Enter` key in quick succession (under 100ms) using a macro tool.
4. **Validation**:
   - Verify that the application intercepts the input and redirects the browser directly to the target Batch Detail page without requiring the user to click the search button manually.
