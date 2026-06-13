# Feature Specification: Inventory Management & Material Consumption

**Feature Branch**: `004-inventory-management`  
**Created**: 2026-06-13  
**Status**: Clarified  
**Input**: User description: "Build an inventory management module for a restaurant production platform. The inventory system must manage both raw materials and finished products..."

## Clarifications

### Session 2026-06-13

- Q: How should the system handle transactions (production order completion, manual adjustments, or transfers) that would cause a stock level to drop below zero? → A: Use a hybrid policy: (1) Allow completion of production orders even if inventory becomes negative (with a warning displayed before completion, logging a negative inventory event, and flagging the item for reconciliation); (2) Strictly block warehouse transfers if sufficient stock does not exist; (3) Block manual adjustments that would result in negative stock (users must explicitly perform a stock correction/count instead); (4) Highlight negative inventory items in dashboards and discrepancy reports.
- Q: When a production order is completed, should the system always consume the exact standard recipe quantities, or should users be allowed to record actual quantities consumed? → A: Automatic Consumption with Separate Waste Adjustments: Consumption is calculated automatically as (Recipe Ingredient Quantity × Production Ratio = Consumed Quantity). Users cannot edit these calculated consumption values directly. Any additional ingredient use, damage, waste, or discard must be recorded as a separate, auditable manual inventory adjustment with a mandatory reason (e.g., "Production Waste").
- Q: Should warehouse staff or kitchen staff be restricted to viewing and adjusting inventory only within their assigned warehouses (using UserInventoryArea mapping in Prisma), or should all users be able to view and manage all warehouses globally? → A: Global Visibility with Scoped Operational Permissions: All users can view and search stock levels across all warehouses globally to see material availability. However, users may only perform operational actions (including inventory adjustments, transfers from a source warehouse, production consumption, production output receipt, stock receipts, and stock issues) within the warehouses explicitly assigned to their account via UserInventoryArea.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Inventory Item Catalog (Priority: P1)

Authorized users (Admins and Inventory Managers) can view, create, edit, and deactivate inventory items. Each item is classified as either a raw material, semi-finished product, or finished product, and is assigned a base unit of measure (e.g., kilograms, grams, liters, pieces) that remains consistent across the platform.

**Why this priority**: This is the foundation of the inventory system. No stock levels, movements, or consumption can be tracked without a unified catalog of inventory items.

**Independent Test**: Can be fully tested by creating a new inventory item (e.g., "Whole Milk"), verifying it appears in the active items catalog, and editing its category or deactivating it.

**Acceptance Scenarios**:

1. **Given** a logged-in user with inventory management authorization, **When** they create a new inventory item with a unique code, name, category, and base unit of measure, **Then** the item is successfully saved and is marked as active.
2. **Given** an existing inventory item, **When** an authorized user updates its name or category, **Then** the updates are saved and reflected across the system.
3. **Given** an existing inventory item in use by recipe ingredients or stock levels, **When** an authorized user attempts to delete it, **Then** the system prevents deletion and allows deactivating (soft-deleting) the item instead, ensuring historical records remain intact.
4. **Given** a logged-in user without inventory management authorization, **When** they attempt to create or edit an inventory item, **Then** the system denies the action and displays an appropriate access-denied message.

---

### User Story 2 - View Real-Time Stock Levels (Priority: P1)

Users can view current stock levels for all inventory items across all warehouses and storage locations. The view provides a consolidated breakdown of total stock on hand, stock per warehouse, and item status.

**Why this priority**: Essential for daily kitchen operations and inventory planning. Production staff and managers must know exactly what materials are available to plan production and avoid shortages.

**Independent Test**: Can be fully tested by navigating to the stock levels dashboard, searching for an item, and verifying that the listed stock quantities match the sum of recent ledger movements for each location.

**Acceptance Scenarios**:

1. **Given** a logged-in user with inventory view permissions, **When** they view the stock levels dashboard, **Then** they see a filterable table of active inventory items displaying the item code, name, category, warehouse location, and current quantity on hand with its unit of measure.
2. **Given** a user searching for stock, **When** they type an item code or name into the search bar, **Then** the system filters the table in real-time.
3. **Given** a user filtering by a specific warehouse, **When** they select the warehouse from the filter options, **Then** the table shows only the stock levels physically located in that warehouse.
4. **Given** a staff member with warehouse-scoped access permissions (configured via UserInventoryArea), **When** they open the stock levels dashboard, **Then** the system displays stock levels and allows searches across all warehouses globally, enabling them to locate materials.

---

### User Story 3 - Automatic Production Consumption and Receipt (Priority: P1)

When a production order is completed, the system automatically triggers inventory changes: it deducts the required quantities of raw materials from the designated kitchen warehouse (based on the recipe definition) and adds the actual produced quantity of the finished product to the designated finished goods warehouse.

**Why this priority**: This automates real-time inventory tracking and ties physical kitchen output directly to material consumption, ensuring complete traceability.

**Independent Test**: Can be fully tested by completing a production order, and verifying that: (1) the stock level of the recipe's raw materials in the production warehouse decreases, (2) the stock level of the produced finished product in the storage warehouse increases, and (3) both changes are recorded as ledger movements linked to the completed production order.

**Acceptance Scenarios**:

1. **Given** a production order is marked as completed, **When** the system finalizes the completion, **Then** it calculates the raw material consumption and posts a deduction movement for each ingredient in the designated production warehouse, and posts an addition movement for the finished product in the designated storage warehouse.
2. **Given** a completed production order, **When** the system calculates raw material consumption, **Then** it automatically calculates consumption based on the recipe version and actual produced quantity (Recipe Ingredient Quantity × Production Ratio = Consumed Quantity, where Production Ratio = Actual Produced Quantity / Recipe Target Yield), and users cannot directly edit the calculated values.
3. **Given** additional ingredients are used, damaged, wasted, or discarded during production, **When** the user marks completion, **Then** they must record a separate manual inventory adjustment with a mandatory reason (e.g., "Production Waste") to account for the variance, which is fully auditable.
4. **Given** a completed production order triggers an automated inventory deduction, **When** the deduction quantity exceeds the current stock on hand in the warehouse, **Then** the system allows the completion of the production order, displays a warning before completion, logs a negative inventory event, and flags the affected item for reconciliation.
5. **Given** a completed production order is traced, **When** a user views the inventory history, **Then** they can click on the movement and navigate directly to the completed production order that triggered it.
6. **Given** any negative stock exists, **When** a supervisor or administrator views the dashboard or runs reports, **Then** the negative inventory items are clearly highlighted and included in the inventory discrepancy report.

---

### User Story 4 - Transfer Inventory Between Warehouses (Priority: P2)

Authorized users can record the physical transfer of inventory items from a source warehouse to a destination warehouse. The system ensures the movement is recorded symmetrically.

**Why this priority**: Essential for managing multiple storage locations (e.g., transferring raw materials from a central freezer/dry store to a specific line kitchen).

**Independent Test**: Can be fully tested by submitting a transfer of 10 units of an item from Warehouse A to Warehouse B, verifying that Warehouse A's stock decreases by 10, Warehouse B's stock increases by 10, and two matching movement entries are recorded in the ledger.

**Acceptance Scenarios**:

1. **Given** an authorized user initiates an inventory transfer, **When** they select a source warehouse, a destination warehouse, an item, and a quantity to transfer, **Then** the system validates that the source and destination are different and that the transfer quantity is greater than zero.
2. **Given** a validated transfer submission, **When** the transfer is confirmed, **Then** the system posts a "Transfer Out" movement (deduction) from the source warehouse and a matching "Transfer In" movement (addition) to the destination warehouse, linking both to a single Transfer record.
3. **Given** a transfer is initiated, **When** the source warehouse does not have sufficient stock on hand for the transfer quantity, **Then** the system blocks the transfer and displays an error message stating there is insufficient stock.
4. **Given** a non-admin user attempts to initiate a transfer, **When** the source warehouse is not assigned to their UserInventoryArea profile, **Then** the system blocks the transfer and displays a validation error.

---

### User Story 5 - Record Manual Adjustments (Priority: P2)

Authorized users can manually adjust the stock level of an item in a specific warehouse to reconcile digital levels with physical counts, or to record waste, spoilage, or theft. Every manual adjustment requires a documented reason.

**Why this priority**: Digital records occasionally deviate from physical stock due to wastage, spillage, or physical inventory counts. Manual adjustments are required to keep the system aligned with reality.

**Independent Test**: Can be fully tested by recording a manual adjustment of -2.5 kg of flour in a kitchen warehouse with the reason "spoilage", and verifying that the stock level is reduced and a ledger entry is created with the reason documented.

**Acceptance Scenarios**:

1. **Given** an authorized user is recording a manual adjustment, **When** they select a warehouse, an item, the adjustment quantity (positive or negative), and select/write a reason (e.g., "Physical Count Counted", "Spoilage", "Wastage", "Theft"), **Then** the system saves the adjustment and updates the warehouse stock level.
2. **Given** a manual adjustment form, **When** the user attempts to save it without providing a reason, **Then** the system blocks submission and displays a validation error requiring a reason.
3. **Given** a user without manual adjustment permissions, **When** they attempt to submit a manual adjustment, **Then** the system blocks the action and displays an appropriate error.
4. **Given** a manual adjustment is recorded, **When** the adjustment would cause the stock level to drop below zero, **Then** the system blocks the adjustment and displays a validation error instructing the user to perform an explicit stock correction or physical count instead.
5. **Given** a non-admin user attempts to record a manual adjustment, **When** the target warehouse is not assigned to their UserInventoryArea profile, **Then** the system blocks the action and displays a validation error.

---

### User Story 6 - Review Inventory History & Traceability Ledger (Priority: P2)

Users can view a chronological audit ledger of all inventory movements. The ledger provides complete traceability showing who, when, what item, what warehouse, and why a change occurred, with direct links to the originating document.

**Why this priority**: Traceability is a core constitutional principle. It is required for food safety audits, cost accounting, and investigating inventory discrepancies.

**Independent Test**: Can be fully tested by viewing the inventory history log, filtering by item or warehouse, and verifying that every single transaction contains the date, user, quantity change, type of event, and a clickable link to the source transaction (e.g., Production Order, Warehouse Transfer, or Manual Adjustment).

**Acceptance Scenarios**:

1. **Given** a user viewing the inventory ledger, **When** they select filters for item, warehouse, date range, or transaction type, **Then** the system filters the chronological list of movements.
2. **Given** an inventory movement entry, **When** a user clicks on its source link, **Then** the system navigates them to the detail page of the corresponding originating transaction (e.g., Production Order detail, Transfer record, or Manual Adjustment summary).
3. **Given** any stock level calculation, **When** the historical ledger is reviewed, **Then** the current stock level is verified as the sum of all historical movement quantities, ensuring that historical changes or updates to recipes/warehouses do not retroactively alter historic stock levels.

---

### Edge Cases

- **Recipe changes over time**: If a recipe is updated to a new version with different ingredient quantities, completed production orders that used the old version must maintain their historical consumption calculations. The inventory ledger must not recalculate past consumption.
- **Warehouse deactivation**: If a warehouse is deactivated (e.g., a line kitchen closes), its historic stock movements must remain intact for reporting, but new transfers, adjustments, or production orders cannot designate it.
- **Concurrent adjustments**: If a manual adjustment is submitted while a production order completes and consumes stock of the same item in the same warehouse, the system must handle concurrency correctly, ensuring that both transactions are serialized and the final stock level is mathematically correct.
- **Zero or negative inputs**: If a user enters a negative transfer quantity or a zero quantity adjustment, the system must reject the input. (Note: Manual adjustments can have negative values to represent deductions, but transfers must always be positive values).
- **Unit mismatch**: If an inventory item is measured in "kilograms" but a recipe ingredient calls for "grams", the system must correctly convert the consumed gram amount to kilograms (or vice versa) based on standard unit conversions (1 kg = 1000g) during the consumption deduction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support a catalog of inventory items, each with a unique Item Code, Name, Category (Raw Material, Semi-Finished, Finished Product, Packaging), Base Unit of Measure (KG, GRAM, LITER, MILLILITER, PIECE), and Active status.
- **FR-002**: The system MUST support multiple Warehouse locations, each with a Name, Code, and Active status.
- **FR-003**: The system MUST track Stock Levels dynamically per Inventory Item per Warehouse.
- **FR-004**: The system MUST record every change in stock as a Stock Movement ledger entry. Each entry MUST store:
  - Timestamp (ISO 8601 UTC)
  - Performing User ID
  - Warehouse ID
  - Inventory Item ID
  - Quantity Delta (decimal value, positive or negative)
  - Movement Type (e.g., Purchase Receipt, Production Consumption, Production Receipt, Transfer Out, Transfer In, Manual Adjustment)
  - Source Reference ID (links to Production Order, Transfer, or Manual Adjustment record)
- **FR-005**: The system MUST prevent physical deletion of inventory items or warehouses if they have associated stock movements. Only deactivation (soft-deleting) is permitted to preserve ledger history.
- **FR-006**: When a production order is completed:
  - The system MUST automatically deduct raw materials from the designated kitchen warehouse based on the recipe version definition.
  - The system MUST automatically add the produced finished product to the designated storage warehouse.
  - The system MUST post these updates as related Stock Movements linked to the Production Order ID.
- **FR-006b**: **Production Consumption Calculation**: The system MUST calculate raw material consumption automatically using the formula: `Recipe Ingredient Quantity * Production Ratio = Consumed Quantity` (where `Production Ratio = Actual Produced Quantity / Recipe Target Yield`).
- **FR-006c**: **Immutability of Calculated Consumption**: The system MUST prevent users from directly editing calculated consumption values during or after production completion.
- **FR-006d**: **Wastage & Loss Adjustments**: If additional ingredients are used, damaged, wasted, or discarded during production, users MUST record a separate manual inventory adjustment with a mandatory reason (e.g., "Production Waste") to reflect these losses.
- **FR-006a**: **Production Negative Stock Policy**: The system MUST allow the completion of production orders even if raw material deduction causes the stock level to become negative. The system MUST display a warning message to the user before completion, log a negative stock event, and flag the affected inventory items for reconciliation.
- **FR-007**: The system MUST support Warehouse Transfers. A transfer MUST deduct quantity from the source warehouse (Transfer Out) and add the identical quantity to the destination warehouse (Transfer In) in a single atomic transaction.
- **FR-007a**: **Transfer Stock Validation**: The system MUST block warehouse transfers if the source warehouse does not have sufficient stock on hand.
- **FR-008**: The system MUST support Manual Adjustments. Every manual adjustment MUST record the quantity delta and a mandatory Reason selected from a predefined list (e.g., Physical Count, Spoilage, Wastage, Theft, Other) along with optional notes.
- **FR-008a**: **Adjustment Stock Validation**: The system MUST block manual adjustments that would result in negative stock, forcing the user to perform an explicit stock correction or physical count instead.
- **FR-009**: The system MUST enforce Role-Based Access Control (RBAC):
  - Administrators and Inventory Managers have full access (view, manage items, perform transfers, manual adjustments).
  - Production Supervisors can view stock levels and perform transfers.
  - Production Staff can view stock levels.
  - Warehouse Staff can view stock levels, perform transfers, and record adjustments.
- **FR-009a**: **Global Inventory Visibility**: All authenticated users with inventory access MUST have global visibility to view and search stock levels across all warehouses and locations.
- **FR-009b**: **Scoped Inventory Action Permissions**: Non-administrator/non-manager users (e.g., Warehouse Staff, Production Staff, and Production Supervisors) MUST only perform operational inventory actions (transfers from source warehouse, adjustments, production consumption, production output receipt, stock receipts, and stock issues) within the warehouses explicitly assigned to their user account via the UserInventoryArea configuration.
- **FR-010**: The system MUST enforce unit conversions where necessary during consumption (e.g., converting grams to kilograms) when the recipe ingredient unit differs from the inventory item's base unit. If units are incompatible, the system MUST flag a configuration error and block the production completion.
- **FR-011**: **Negative Inventory Reporting**: The system MUST highlight negative inventory items on the stock dashboard and include all negative inventory events in discrepancy reports.

### Key Entities

- **Inventory Item**: A catalog definition of an item that can be stocked. Attributes: ID, Code, Name, Category, Base Unit, Active Status, Timestamps.
- **Warehouse**: A physical storage location. Attributes: ID, Code, Name, Active Status, Timestamps.
- **Stock Level**: The current quantity of a specific Inventory Item at a specific Warehouse. Calculated as the running sum of Stock Movements, or cached as a current state. Attributes: Warehouse ID, Inventory Item ID, Quantity.
- **Stock Movement (Ledger)**: A single immutable audit entry representing a change in stock. Attributes: ID, Timestamp, User ID, Warehouse ID, Inventory Item ID, Quantity Delta, Movement Type, Source Reference ID, Reason.
- **Inventory Transfer**: A transaction representing stock movement between warehouses. Attributes: ID, User ID, Source Warehouse ID, Destination Warehouse ID, Inventory Item ID, Quantity, Timestamp.
- **Manual Adjustment**: A transaction representing a manual correction. Attributes: ID, User ID, Warehouse ID, Inventory Item ID, Quantity Delta, Reason, Notes, Timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Stock levels dashboard loads and displays current inventory levels for any item/warehouse within 1.0 second under a database size of 10,000+ movement records.
- **SC-002**: 100% of stock level changes (production consumption, receipt, transfers, manual adjustments) are recorded in the Stock Movement ledger with a valid User ID, Timestamp, and Source Reference ID.
- **SC-003**: The system maintains 100% mathematical accuracy between current Stock Levels and the sum of historical Stock Movements.
- **SC-004**: Users can execute a warehouse transfer or record a manual adjustment in under 3 clicks from the inventory management dashboard.
- **SC-005**: Zero inventory records are permanently deleted, confirmed by soft-delete validation tests showing deactivation preserves historic ledger traceability.
- **SC-006**: The system correctly flags and converts units (e.g., grams to kilograms) during production consumption, preventing unit mismatch errors in 100% of tested production completions.

## Assumptions

- **A-001**: Role-based access control and user authentication are inherited from the existing user management system (`specs/001-user-auth-roles`).
- **A-002**: Recipes and ingredients are defined in the recipe management module (`specs/002-recipe-management`), including ingredient mapping to `inventoryItemId` and ingredient quantities.
- **A-003**: Production orders are executed and completed in the production orders module (`specs/003-production-orders`), which triggers the hooks to consume raw materials and add finished products.
- **A-004**: Financial/costing accounting methods (like FIFO, LIFO, or Weighted Average Cost) are out of scope for this inventory management module v1; the system tracks physical units of measure only.
- **A-005**: Purchase ordering, supplier management, and billing/invoice reconciliation are out of scope for this module.
- **A-006**: Sub-locations (e.g., shelf, bin, aisle) within a single Warehouse are out of scope for v1; a Warehouse is the finest location granularity.
