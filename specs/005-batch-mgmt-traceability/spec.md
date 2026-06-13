# Feature Specification: Batch Management, QR Code, and Label Printing

**Feature Branch**: `005-batch-mgmt-traceability`  
**Created**: 2026-06-13  
**Status**: Draft  
**Input**: User description: "Build a batch management and product traceability module for a restaurant production platform. Every completed production order must generate a unique production batch. A batch represents a specific production run of a product and serves as the primary traceability unit across the platform. The system must automatically generate batch identifiers and associate them with production records, inventory records, staff activity, recipe versions, and production evidence. Each batch must support QR code generation and printable product labels. Labels must contain production and expiry information and allow operational staff to quickly identify and trace products. Scanning a QR code must provide access to authorized traceability information including production details, recipe version, production staff, storage instructions, and production evidence. The goal is to provide complete product traceability from production through storage and inventory management."


## Clarifications

### Session 2026-06-13

- Q: What level of access control is required when scanning the physical QR code? → A: Option C (Fully Gated). Scanning a QR code redirects to the batch traceability page, which requires authentication before displaying any information. Access is restricted by user roles (Production Staff, Warehouse Staff, Supervisors, Administrators).
- Q: Do we need to log and trace the specific ingredient batches used to make this production batch, or is it limited to tracing the output batch itself? → A: Option A (Single-Level Output Tracking). Each completed production order generates a unique output batch storing recipe details, production date, expiry date, quantity, staff, and evidence. Tracking of individual raw material batch numbers is out of scope; inventory consumption remains linked to inventory items and warehouses only.
- Q: Should the system support multiple label sizes and templates, or is a single predefined standard layout sufficient? → A: Option B (Multiple Fixed Pre-sets). The system must support a small set of standard predefined label templates (e.g., Small 50mm x 50mm, Standard 100mm x 50mm, Large 100mm x 100mm). Each contains core fields (Product Name, Batch ID, Dates, Quantity, Unit, QR Code) and optional fields (Storage Instructions, Product Code, Warehouse). Administrators select the default template, and operators can choose from the approved list when printing.

## User Scenarios & Testing *(mandatory)*


### User Story 1 - Automatic Batch Generation on Production Order Completion (Priority: P1)

As a kitchen operator, when I mark a production order as completed, I want the system to automatically generate a unique batch and link all related logs (recipe version, production staff, timestamps) so that I do not have to manually enter traceability details.

**Why this priority**: It is the foundation of the traceability system. Without automated batch creation upon completion, traceability gaps will occur due to human error or omission.

**Independent Test**: Can be tested by marking a production order in progress as "Completed" and verifying that a new batch record is immediately created in the system with a unique, auto-generated batch ID, containing links to the recipe version used, the staff members involved, and the parent production order.

**Acceptance Scenarios**:

1. **Given** a production order is in progress, **When** the kitchen operator marks it as completed, **Then** the system automatically generates a unique batch identifier (e.g., `B-YYYYMMDD-[Sequence]`) and creates a new batch record.
2. **Given** a generated batch record, **When** reviewed in the platform, **Then** it must correctly show the linked production order, the specific recipe version used, the staff members who performed the work, and the exact timestamps of production.

---

### User Story 2 - Product Label and QR Code Generation (Priority: P1)

As a kitchen operator, I want to print a standardized adhesive label containing the product name, batch ID, production date, expiry date, storage instructions, and a scannable QR code so that I can affix it to the product packaging before it goes into storage.

**Why this priority**: Labels and QR codes are the physical bridge between the physical product and the digital traceability system. Operational staff cannot identify or scan items in the warehouse without them.

**Independent Test**: Can be tested by selecting a completed batch, requesting a label print preview, verifying all details are present, and successfully scanning the QR code with a standard reader to verify it redirects to the correct traceability details URL.

**Acceptance Scenarios**:

1. **Given** a completed batch, **When** the operator opens the batch details and clicks "Print Label", **Then** the system displays a print preview layout containing Product Name, Batch ID, Production Date, Expiry Date, Storage Instructions, and a scannable QR code.
2. **Given** the label is printed on an operational label printer, **When** scanned with a mobile device, **Then** it must successfully load the corresponding batch traceability information.

---

### User Story 3 - Traceability Portal and Search (Priority: P2)

As a supervisor or auditor, I want to scan a product's QR code or search for a batch ID in the portal to view the entire production history, recipe version details, staff involved, and linked production evidence so that I can audit product quality or conduct trace investigations.

**Why this priority**: Provides the primary value of traceability by allowing staff to instantly lookup details during audits, inventory checks, or customer complaints.

**Independent Test**: Can be tested by searching for a batch ID in the search bar or scanning the QR code, then verifying that all associated records (including recipe version, staff actions, and evidence) are shown in a unified, chronological timeline.

**Acceptance Scenarios**:

1. **Given** a supervisor scans a batch QR code or searches the ID, **When** they are authenticated, **Then** they see a comprehensive timeline including production date, recipe version, staff, storage instructions, and any linked production evidence.
2. **Given** a batch traceability record, **When** reviewing the recipe details, **Then** the user can click to view the specific, read-only version of the recipe used during that specific production run.

---

### User Story 4 - Quality Control and Production Evidence Logging (Priority: P3)

As a kitchen supervisor, I want to upload production evidence (such as photos of the finished product, temperature log sheets, or QA checklists) to a batch record so that there is verifiable proof of quality compliance.

**Why this priority**: Strengthens the traceability module by adding physical verification (e.g., photos) and compliance data to standard logs.

**Independent Test**: Can be tested by uploading a image/document file as evidence to an existing batch, saving it, and verifying it displays correctly on the batch's traceability page.

**Acceptance Scenarios**:

1. **Given** a completed batch, **When** a supervisor uploads a production evidence file (e.g., JPEG, PNG, or PDF), **Then** the file is associated with the batch and saved.
2. **Given** a supervisor views the traceability page for a batch, **When** they look at the production evidence section, **Then** they must see and be able to open/download all uploaded evidence files.

---

### Edge Cases

- **Partial Production Completion**: What happens when a production order is only partially completed (e.g., target was 100 units, but only 50 were produced today)?
  - *Resolution*: Each partial completion must generate its own unique batch for that specific run, linking back to the same production order but capturing the specific staff, date, and quantity for that run.
- **Recipe Changes Mid-Production**: What happens if a recipe version is updated or archived while a production order is in progress?
  - *Resolution*: The batch must link to the exact recipe version that was active and selected at the time the production order was started/completed, preventing history from altering.
- **Scanning Offline/No Internet**: What happens when a warehouse worker scans a QR code in a cold storage room with poor internet connectivity?
  - *Resolution*: The label must include the human-readable Batch ID and key details (Expiry, Storage) so the worker can identify the product manually even if the digital portal cannot load.
- **Damaged QR Code**: What happens if a QR code is smudged or torn?
  - *Resolution*: The search interface in the web application must support manual lookup by typing the alphanumeric Batch ID printed next to the QR code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically generate a unique batch identifier upon the completion of a production order or partial production run.
- **FR-002**: The batch identifier MUST follow a standardized, chronological naming convention (e.g., `B-YYYYMMDD-[Sequence]`) to allow quick date identification.
- **FR-003**: The system MUST link each batch record to the parent production order, the specific recipe version used, the staff members who executed the order, and the production date/time.
- **FR-004**: The system MUST automatically calculate the product's expiry date based on the production date and the shelf-life configuration defined in the recipe version.
- **FR-005**: The system MUST generate a unique URL for each batch that serves as the destination for the batch QR code.
- **FR-006**: The system MUST support viewing and scanning the QR code to open the authorized traceability detail view.
- **FR-007**: The system MUST allow authorized users to print a standardized product label containing the Product Name, Batch ID, Production Date, Expiry Date, Storage Instructions, and the scannable QR Code.
- **FR-008**: The system MUST allow supervisors to upload production evidence (images or PDFs up to 5MB) and associate them with a specific batch.
- **FR-009**: The system MUST enforce fully gated access control on the batch traceability page. Scanning a QR code redirects to this page, which requires authentication before any batch information is displayed. Access is restricted as follows: Production Staff can view assigned batch information; Warehouse Staff can view batch and storage details; Supervisors can view complete traceability information; Administrators have full access. Unauthorized users cannot view any batch details, production staff information, recipe versions, production evidence, or inventory information.
- **FR-010**: The system MUST support single-level output batch tracking for each completed production order. The system is NOT required to track individual raw material batch numbers used during production; inventory consumption remains linked to inventory items and warehouses only.
- **FR-011**: The system MUST support printing multiple predefined label layout templates (e.g., Small 50mm x 50mm, Standard 100mm x 50mm, Large 100mm x 100mm) containing core traceability fields (Product Name, Batch Number, Production Date, Expiry Date, Quantity, Unit, QR Code) and optional fields (Storage Instructions, Product Code, Warehouse). Administrators can configure the default layout, and operators can select from approved templates at the time of printing.

### Key Entities *(include if feature involves data)*

- **ProductionBatch**: Represents a single production run of a product.
  - *Key Attributes*: Batch ID (unique string), Production Order Link, Recipe Version Link, Production Date/Time, Expiry Date, Created By (Staff Link), Status (e.g., In Storage, Disposed, Used in Production), Storage Location.
- **ProductionEvidence**: Represents files or checklists logged during production.
  - *Key Attributes*: Evidence ID, Batch Link, File Type, File URL, Uploaded By (Staff Link), Uploaded Timestamp, Description.
- **RecipeVersion**: Represents the recipe configuration used (referenced from Recipe Management).
  - *Key Attributes*: Recipe ID, Version Number, Shelf Life Days, Storage Instructions.
- **InventoryRecord**: Represents physical stock of a product batch in a warehouse (referenced from Inventory Management).
  - *Key Attributes*: Record ID, Batch Link, Current Quantity, Location, Transactions History.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of completed production orders successfully generate a unique, traceable production batch without manual data entry.
- **SC-002**: Operational staff can generate and print a batch label in under 5 seconds from the moment they mark a production order as completed.
- **SC-003**: In audit scenarios, tracing a batch back to its recipe version, production staff, and quality evidence takes under 10 seconds via QR scan or ID search.
- **SC-004**: System supports scanning and displaying batch traceability data on mobile/tablet screens without layout breakdown or text overlap.

## Assumptions

- **A-001**: Recipes already have a defined shelf life (in days) and storage instructions configured, which are used to calculate the expiry date and populate the label.
- **A-002**: Standard thermal label printers will be used, and the system can output print-ready layouts (HTML/CSS or PDF) optimized for standard browser printing.
- **A-003**: The platform has a file storage solution capable of receiving and serving uploaded production evidence files (photos, PDFs).
- **A-004**: Users must have a camera-enabled mobile device or a hand scanner to scan the generated QR codes.
