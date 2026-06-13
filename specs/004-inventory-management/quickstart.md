# Quickstart & Validation Guide: Inventory Management & Material Consumption

This guide provides step-by-step scenarios to manually validate that the Inventory Management module operates correctly and adheres to all specification requirements.

---

## Prerequisites
- A running database with the Prisma migrations applied.
- User accounts created with roles: `Administrator`, `ProductionSupervisor`, `WarehouseStaff`, and `ProductionStaff` (using specs/001-user-auth-roles).
- Active recipes defined in the recipe catalog (using specs/002-recipe-management).

---

## Scenario 1: Setup Warehouses and Inventory Items
**Goal**: Verify that catalog data can be created with correct validations.
1. Log in as an **Administrator**.
2. Navigate to **Warehouse Management** and create three warehouses:
   - Name: `Main Warehouse`, Code: `WH-MAIN`
   - Name: `Line Kitchen 1`, Code: `WH-LK1`
   - Name: `Finished Storage`, Code: `WH-STORE`
3. Navigate to **Inventory Catalog** and create items:
   - Name: `Flour`, Code: `RAW-FLOUR-001`, Type: `RAW_MATERIAL`, Unit: `KG`, Category: `Dry Goods`
   - Name: `Water`, Code: `RAW-WATER-001`, Type: `RAW_MATERIAL`, Unit: `LITER`, Category: `Liquids`
   - Name: `Pizza Dough`, Code: `FIN-DOUGH-001`, Type: `FINISHED_PRODUCT`, Unit: `KG`, Category: `Prepped Foods`
4. **Expected Outcome**: All entities are saved successfully. Verify they appear in the dashboards and active catalog listings.

---

## Scenario 2: Add Initial Stock via Manual Adjustment
**Goal**: Verify positive manual adjustments and ledger updates.
1. Navigate to **Inventory Adjustments** as an **Administrator**.
2. Select item `Flour`, warehouse `WH-MAIN`, set quantity to `+100.0`, reason `INVENTORY_RECONCILIATION`, and notes `Initial stock intake`. Save.
3. Select item `Water`, warehouse `WH-MAIN`, set quantity to `+50.0`, reason `INVENTORY_RECONCILIATION`. Save.
4. **Expected Outcome**: 
   - Stock level of `Flour` in `WH-MAIN` is `100.0 KG`.
   - Stock level of `Water` in `WH-MAIN` is `50.0 LITER`.
   - Chronological ledger logs two `ADJUSTMENT_INCREASE` movements with the correct user and timestamp.

---

## Scenario 3: Verify Global Stock Visibility
**Goal**: Verify that all users can view stock levels everywhere.
1. Log in as a **Production Staff** member.
2. Navigate to the **Stock Levels Dashboard**.
3. Search for `Flour` and view results.
4. **Expected Outcome**: The user can see that `WH-MAIN` has `100.0 KG` of `Flour`, even if the user is not assigned to `WH-MAIN`.

---

## Scenario 4: Perform Warehouse Transfer
**Goal**: Verify symmetrical stock transfers.
1. Log in as a **Warehouse Staff** member who is assigned to `WH-MAIN` and `WH-LK1` in `UserWarehouse`.
2. Navigate to **Inventory Transfers** and initiate a transfer:
   - Source Warehouse: `Main Warehouse` (WH-MAIN)
   - Destination Warehouse: `Line Kitchen 1` (WH-LK1)
   - Item: `Flour` (RAW-FLOUR-001)
   - Quantity: `20.0`
3. Submit transfer.
4. **Expected Outcome**:
   - `WH-MAIN` Flour stock decreases to `80.0 KG`.
   - `WH-LK1` Flour stock increases to `20.0 KG`.
   - History logs a `TRANSFER_OUT` from `WH-MAIN` and a matching `TRANSFER_IN` to `WH-LK1`.

---

## Scenario 5: Block Warehouse Transfer (Insufficient Stock)
**Goal**: Verify negative stock prevention on transfers.
1. Attempt to transfer `30.0 LITER` of `Water` from `WH-LK1` (which currently has `0.0 LITER`) to `WH-MAIN`.
2. Submit transfer.
3. **Expected Outcome**: The system blocks the transfer, showing a validation error: `"Insufficient stock in source warehouse."` No ledger entries are created.

---

## Scenario 6: Block Manual Adjustment Resulting in Negative Stock
**Goal**: Verify negative stock prevention on manual adjustments.
1. Navigate to **Inventory Adjustments** as a **Warehouse Staff** member.
2. Select item `Flour`, warehouse `WH-LK1` (which has `20.0 KG` on hand).
3. Try to record an adjustment of `-25.0` (reason `LOST_MATERIALS`). Submit.
4. **Expected Outcome**: The system blocks the submission, showing an error: `"Adjustment blocked: would result in negative stock."`

---

## Scenario 7: User Location Scope Restriction Check
**Goal**: Verify that users cannot perform actions outside their assigned locations.
1. Create a **Warehouse Staff** user named "Salim". Assign Salim only to `WH-LK1` in `UserWarehouse`.
2. Log in as Salim.
3. Attempt to record a manual adjustment or initiate a transfer from `WH-MAIN`.
4. **Expected Outcome**: The system denies the action, showing: `"Access Denied: You are not authorized to perform actions in Main Warehouse."`

---

## Scenario 8: Record Spoilage Waste
**Goal**: Verify waste logs do not modify recipe standard consumption and are tracked separately.
1. Navigate to **Waste Recording**.
2. Record waste:
   - Item: `Flour`
   - Warehouse: `WH-LK1`
   - Quantity: `1.5 KG`
   - Reason: `SPOILAGE`
   - Notes: `Water leak damaged the flour bag`
3. Save.
4. **Expected Outcome**:
   - `WH-LK1` Flour stock level decreases from `20.0 KG` to `18.5 KG`.
   - A `WASTE` movement is recorded in the ledger.
   - The entry appears in the waste log dashboard for audit review.

---

## Scenario 9: Production Completion Automatic Flow
**Goal**: Verify recipe consumption, finished product receipt, and negative stock policy.
1. Create a recipe for `Pizza Dough` with target yield `10.0 KG`:
   - Ingredient 1: `Flour` - `7.0 KG`
   - Ingredient 2: `Water` - `3.0 LITER`
2. Create and start a production order for `Pizza Dough`, set output to `WH-STORE` (storage) and ingredients to consume from `WH-LK1`. Set actual produced quantity to `10.0 KG` (Ratio = 1.0).
3. Complete the production order.
4. **Expected Outcome**:
   - `WH-LK1` has `18.5 KG` of Flour and `0.0 LITER` of Water on hand.
   - Flour consumption: `7.0 KG`. Stock level of Flour in `WH-LK1` decreases to `11.5 KG`.
   - Water consumption: `3.0 LITER`. Since Water stock is `0.0`, the system displays a warning message about negative stock, allows completion, logs a negative stock event, and flags Water in `WH-LK1` for reconciliation. Stock level of Water in `WH-LK1` becomes `-3.0 LITER`.
   - Finished product output: `10.0 KG` of `Pizza Dough` is added to `WH-STORE`.
   - Ledger movements are posted for all consumption and outputs, referencing the completed production order.
