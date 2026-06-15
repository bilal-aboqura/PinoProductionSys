# Feature Specification: Settings and Master Data

**Feature Branch**: `008-settings-master-data`  
**Created**: 2026-06-15  
**Status**: Draft  
**Input**: User description: "Build a centralized settings and master data management module for a restaurant production platform. The module provides administrative configuration for operational entities used throughout the platform. Master data serves as the foundation for recipes, production orders, inventory management, batch traceability, reporting, and notifications. Administrators must be able to manage configurable reference data without requiring code changes. The goal is to ensure operational flexibility while maintaining consistency across all modules."

## Clarifications

### Session 2026-06-15

- **Q1: Negative Stock Policy Toggle** → **A**: Hardcoded for V1. The hybrid negative stock policy is fixed and cannot be changed by administrators in V1.
  - *Production Consumption*: Allow negative stock with warning.
  - *Transfers*: Block transfer if source stock is insufficient.
  - *Manual Adjustments*: Negative stock is strictly disallowed.
  - *Reasoning*: Reduces unnecessary implementation and testing complexity by utilizing the approved hybrid policy.
- **Q2: Unit of Measure Configuration Scope** → **A**: Predefined Units Only in V1. Supported base units are fixed to: `KG`, `Gram`, `Liter`, `Milliliter`, `Piece`.
  - *Behavior*: Administrators assign these units to inventory items and recipes but cannot create custom units or custom conversion rules.
  - *Reasoning*: Standard base units satisfy all current operational requirements; dynamic conversions add high complexity unnecessary for initial release.
- **Q3: Audit Log Retention Policy** → **A**: Retain Indefinitely. 
  - *Behavior*: Audit log records have no automated deletion, purging, or archival rules and are retained forever in the database.
  - *Reasoning*: Audit logs are critical to the platform's core pillar of production traceability, operational investigations, and historical reporting.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centralized Master Data Management (Priority: P1)

As a System Administrator, I want to create, view, edit, and deactivate core master data entities (Departments, Production Lines, Inventory Areas, and Recipe Categories) with localized names in Arabic and English, so that these configurations can be reused throughout the platform without requiring database code changes.

**Why this priority**: These entities form the basis of the entire platform's data model. Without them, users cannot assign roles, organize recipes, manage inventory locations, or track production lines.

**Independent Test**: Can be tested by creating a new Department ("Desserts Division" / "قسم الحلويات") and Production Line ("Line 3" / "خط 3") with both English and Arabic names, verifying that they appear in selection dropdowns on other pages (like recipe creation or user roles), and verifying that deactivating them makes them unavailable for new selections while preserving them in historical records.

**Acceptance Scenarios**:

1. **Given** an Administrator is on the Master Data management page, **When** they create a new Department by providing a unique name in English, a name in Arabic, and toggle it as Active, **Then** the department is saved and immediately becomes selectable in the user department mapping interface.
2. **Given** a user is logged in with Arabic language preferences, **When** they view selection dropdowns for departments, **Then** the system displays the Arabic names of the departments.
3. **Given** an active Department is currently linked to historic user mappings or recipes, **When** an Administrator deactivates it, **Then** the department is marked inactive (soft-deleted), is hidden from new selection options, but remains visible in historical reports and audit trails.
4. **Given** a non-administrator user logs in, **When** they attempt to access the Master Data management page, **Then** the system blocks access and displays a permission denied warning.

---

### User Story 2 - Waste & Disposal Reasons Configuration (Priority: P1)

As a System Administrator, I want to manage a customizable list of waste and adjustment reasons (e.g., Spoilage, Spillage, Expiry, Theft, Recipe Trial), so that inventory managers and staff are forced to categorize manual stock corrections using company-approved reasons.

**Why this priority**: Accurate categorization of inventory adjustments is vital for cost control, waste tracking, and financial auditing. Hardcoding these reasons limits operational flexibility.

**Independent Test**: Can be tested by creating a custom reason "Quality Rejection" in the settings, navigating to the manual inventory adjustment screen, and verifying that the new reason appears in the dropdown list and can be used to successfully complete an adjustment.

**Acceptance Scenarios**:

1. **Given** an Administrator is on the Settings page under Waste Reasons, **When** they create a new reason "Tasting Event" with active status, **Then** the reason is successfully saved.
2. **Given** a warehouse operator is recording a manual adjustment, **When** they open the adjustment reasons dropdown, **Then** the system displays all active administrative reasons, including "Tasting Event".
3. **Given** an active reason is in use by historical stock adjustments, **When** the administrator deactivates it, **Then** the system prevents new adjustments from using it, but historical movements still show the correct reason.

---

### User Story 3 - System-Wide Operational Configuration (Priority: P1)

As an Administrator, I want to configure system-wide rules, alert thresholds, and numbering sequences in a central dashboard, so that I can control operational behaviors (such as safety stock margins, barcode sizes, and alert timings) dynamically.

**Why this priority**: Different kitchens have different operating margins. Changing thresholds, print layouts, and numbering prefixes should be doable in real-time by operations managers without software deployments.

**Independent Test**: Can be tested by updating the low-stock alert threshold default percentage from 10% to 15% and saving the settings, then verifying that the system uses 15% as the default trigger point for low stock alerts on items without custom thresholds.

**Acceptance Scenarios**:

1. **Given** an administrator is on the System Settings page, **When** they modify the "Low Stock Alert Threshold (%)" to 15% and click "Save", **Then** the system updates the setting, displays a success toast, and applies this value to default stock calculations.
2. **Given** the system settings form, **When** the administrator attempts to save an invalid value (e.g., a negative percentage or text in a numeric field), **Then** the system displays a validation error and blocks the save operation.

---

### User Story 4 - Audit Trail of Configuration Changes (Priority: P2)

As a Compliance Supervisor or Administrator, I want to view a chronological log of all changes made to master data and system settings, detailing who made the change, when, and the exact before/after values, to maintain accountability and trace operational changes.

**Why this priority**: Administrative settings have massive downstream effects on stock levels, access control, and alerts. A complete audit log ensures compliance and debugging capability.

**Independent Test**: Can be tested by modifying a production line's name, then checking the system audit log to verify that a record is created capturing the timestamp, user ID, target entity, and a JSON payload showing the previous name and the new name.

**Acceptance Scenarios**:

1. **Given** an Administrator changes the name of "Prep Kitchen" to "Central Prep", **When** they view the System Audit Log page, **Then** they see a row detailing: User, Date/Time, Action (e.g., MASTER_DATA_UPDATED), and a expandable detail view showing the JSON diff.

---

### Edge Cases

- **Simultaneous Settings Edits (Concurrency)**: What happens if two administrators attempt to modify the same system setting concurrently?
  - *Resolution*: The system MUST use optimistic locking. If the settings record has been modified since it was loaded, the second submitter receives a concurrency warning and is prompted to reload the latest settings.
- **Deactivating Master Data in Active Use**: What happens if an administrator deactivates a Department that is currently assigned to active users?
  - *Resolution*: Deactivation is permitted (soft-delete), but the system displays a warning message listing the active users affected. The deactivated department remains associated with those users but cannot be selected for new user assignments.
- **Invalid Numbering Formats**: What happens if an administrator inputs an invalid batch numbering prefix pattern (e.g., special characters that break URL routing or file naming)?
  - *Resolution*: The settings input validation MUST enforce strict regular expression checks on sequence prefixes (alphanumeric and hyphens/underscores only).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an administrative interface accessible only to users with the `Admin` or `System Manager` roles to manage Master Data and Settings.
- **FR-002**: The system MUST support dynamic CRUD (Create, Read, Update, Deactivate) for the following Master Data entities:
  - **Departments**: representing operational business divisions (e.g., Pastry, Prep Kitchen).
  - **Production Lines**: representing specific preparation lines.
  - **Inventory Areas**: representing physical stockrooms/warehouses.
  - **Recipe Categories**: representing recipe classifications.
- **FR-003**: All Master Data entities MUST support localization, requiring both an English name and an Arabic name, with optional English/Arabic descriptions.
- **FR-004**: The system MUST prevent physical deletion of any Master Data entity if it is referenced by another record (e.g., inventory logs, recipes, user assignments). It MUST support soft-deleting/deactivating the entity instead.
- **FR-005**: The system MUST support custom Waste & Adjustment Reasons management, allowing administrators to add, edit, and deactivate reasons that appear in manual stock adjust screens.
- **FR-006**: The system MUST support configurable System Settings, stored as key-value pairs or structured records:
  - **Localization Settings**: Default language, Timezone, date format.
  - **Inventory Alert Defaults**: Safety stock percentage threshold, batch expiry warning buffer (in days).
  - **Barcode & Label Defaults**: Code format (e.g., Code128), default printing dimensions, fields to include (Name, Code, Expiry, Batch ID).
- **FR-006a**: The system MUST enforce the hardcoded hybrid negative stock policy (allow negative stock with warning during production order completion, strictly block transfers with insufficient stock, and disallow manual adjustments that result in negative stock). Administrators MUST NOT be able to modify this policy in V1 settings.
- **FR-007**: The system MUST enforce a static, predefined Unit of Measure (UOM) list (KG, Gram, Liter, Milliliter, Piece). Administrators can assign these UOM values to inventory items and recipes, but the system MUST NOT allow the creation of custom units or custom unit conversion matrices in administrative settings.
- **FR-008**: Every creation, modification, or deactivation of settings and master data MUST write an entry to the System Audit Log. The entry MUST store: User ID, timestamp, target entity type, action type, and JSON payload of modified fields (previous vs new values).
- **FR-009**: The system MUST retain system audit logs indefinitely. No automated pruning, purging, or archiving mechanisms are permitted.

### Key Entities *(include if feature involves data)*

- **Department**: (Existing model) Represents an operational department. Must support fields `nameAr` (string) and `nameEn` (string) to support dual languages, and `isActive` (boolean).
- **ProductionLine**: (Existing model) Represents a production line. Must support `nameAr` (string), `nameEn` (string), and `isActive` (boolean).
- **InventoryArea**: (Existing model) Represents a warehouse/storage area. Must support `nameAr` (string), `nameEn` (string), and `isActive` (boolean).
- **RecipeCategory**: (Existing model) Represents a recipe category. Supports `nameAr` (string), `nameEn` (string), and `isActive` (boolean).
- **WasteReason**: Represents custom inventory adjustment reasons. Attributes: `id`, `nameEn` (string, unique), `nameAr` (string, unique), `isActive` (boolean), `createdAt` (timestamp).
- **SystemSetting**: Stores system-wide configuration keys and values. Attributes: `id`, `key` (string, unique), `value` (string/JSON), `description` (string, nullable), `updatedAt` (timestamp), `updatedById` (user reference).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Master data changes (create/update/deactivate) are committed to the database and reflect in dropdown menus/selections within 500ms of saving.
- **SC-002**: Configuration updates are applied dynamically to system logic (e.g., alert thresholds) immediately without requiring app restarts or code deployments.
- **SC-003**: 100% of administrative modifications write an entry to the System Audit Log, including details of the actor, timestamp, and previous vs new states.
- **SC-004**: System settings and master data CRUD actions are fully responsive and function correctly on desktop and tablet viewports.

## Assumptions

- **A-001**: Administrators have high-trust privileges, but all critical actions are auditable.
- **A-002**: Localization handles Arabic and English translations explicitly at the data entry level (requiring both fields for master data).
- **A-003**: Standard browser printing capabilities or existing thermal printer integration will consume the Label Default printer settings.
- **A-004**: Users and roles are managed by the Authentication and RBAC module, and only users with specific admin permissions can access this module's routes.

