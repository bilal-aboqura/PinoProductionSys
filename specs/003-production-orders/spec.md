# Feature Specification: Production Orders

**Feature Branch**: `003-production-orders`  
**Created**: 2026-06-13  
**Status**: Clarified  
**Input**: User description: "Build a production order management module for a restaurant production platform."

## Clarifications

### Session 2026-06-13

- Q: When creating a production order, does a supervisor explicitly assign it to a specific staff member, or does it go into a shared queue that any eligible staff member can self-claim? → A: Both — supervisor can pre-assign a specific staff member at creation time, or leave the order unassigned so any eligible staff member can self-claim it from a shared queue.
- Q: What unit of measure is recorded for produced quantity on a production order? → A: Inherited from the recipe — the unit of measure is defined on the recipe and is locked to the production order at creation time; staff enter only a numeric quantity in that predefined unit.
- Q: What triggers the transition from Pending to In Progress, and who can do it? → A: Both — an explicit "Start Production" button is shown to the assigned staff member, but if a step is completed without pressing it, the system auto-transitions anyway. Production start time is anchored to whichever event occurs first.
- Q: How is "order creation permission" granted to Production Staff — globally or scoped? → A: Scoped per recipe category — an administrator assigns one or more recipe categories to a staff member; that staff member may only create production orders for recipes belonging to their assigned categories. Production Supervisors retain unrestricted access across all categories.
- Q: Can a cancelled production order be reinstated, or is cancellation a permanent terminal state? → A: Terminal — cancellation is irreversible. A new production order must be created from the same recipe if production needs to restart. Cancelled orders are retained in history for audit purposes but cannot be reactivated.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Production Order from Recipe (Priority: P1)

A production supervisor or authorized staff member selects an active recipe version and initiates a new production order. The system permanently links the order to the exact recipe version selected at that moment, even if the recipe is later updated or archived. The order appears in the production queue for assigned staff to act upon.

**Why this priority**: This is the entry point for all production activity. Without the ability to create a production order, no production can occur. This is the foundational capability the entire module depends on.

**Independent Test**: Can be fully tested by creating a production order from an active recipe version, verifying the order record is created, and confirming the linked recipe version ID is immutably stored.

**Acceptance Scenarios**:

1. **Given** a logged-in user with production authorization, **When** they select an active recipe version and submit a new production order, **Then** the system creates the order with status "Pending" and permanently records the recipe version reference.
2. **Given** a Production Staff member with category-scoped permission, **When** they open the recipe selection screen to create a production order, **Then** the system shows only active recipe versions belonging to the categories assigned to that staff member.
3. **Given** a Production Supervisor creating a production order, **When** they open the recipe selection screen, **Then** they see all active recipe versions across all categories.
4. **Given** a supervisor is creating a production order, **When** they choose to pre-assign it, **Then** the system allows them to select a specific eligible staff member as the assignee before saving the order.
5. **Given** a supervisor is creating a production order, **When** they choose not to pre-assign, **Then** the order is saved with status "Pending (Unassigned)" and appears in the shared queue visible to all eligible staff members.
6. **Given** an unassigned production order in the shared queue, **When** an eligible staff member claims it, **Then** the order is assigned to them, removed from the unassigned queue, and its status transitions to "In Progress".
7. **Given** a production order exists and the source recipe is later updated, **When** staff view the production order, **Then** they still see the original recipe version that was in effect at order creation time.
8. **Given** a logged-in user without production authorization, **When** they attempt to create a production order, **Then** the system denies the action and displays an appropriate access-denied message.
9. **Given** no active recipe versions exist within a staff member's authorized categories, **When** they attempt to create a production order, **Then** the system informs the user that no eligible recipes are available.

---

### User Story 2 - Execute Production Steps in Order (Priority: P1)

A production staff member opens an assigned production order and is guided through each recipe workflow step in strict sequence. Each step clearly shows what is required (photo evidence, a note, or a quantity confirmation) before the next step is unlocked. The staff member cannot skip a required step or proceed out of order.

**Why this priority**: This is the core operational workflow. It ensures production consistency, enforces recipe compliance, and enables meaningful traceability evidence. This story directly addresses food safety and quality control.

**Independent Test**: Can be fully tested by opening a production order with multi-step recipe workflow, attempting to skip a step, and verifying the system blocks progression until each step's requirements are satisfied.

**Acceptance Scenarios**:

1. **Given** an assigned production order in "Pending" status, **When** the assigned staff member opens it, **Then** they see a prominent "Start Production" button alongside the first step.
2. **Given** the assigned staff member taps "Start Production", **When** the action is confirmed, **Then** the order transitions to "In Progress", the production start time is recorded, and the first step becomes active.
3. **Given** an assigned staff member completes the first step without having pressed "Start Production", **When** the step is submitted, **Then** the system automatically transitions the order to "In Progress" and records the step completion time as the production start time.
4. **Given** a production order in "In Progress" status, **When** a staff member views the order, **Then** they see all recipe steps in sequence with the current step highlighted and future steps locked.
5. **Given** the current step requires a photo, **When** a staff member attempts to advance without uploading a photo, **Then** the system blocks progression and displays a clear validation message.
6. **Given** the current step requires a note, **When** a staff member attempts to advance without entering a note, **Then** the system blocks progression and displays a clear validation message.
7. **Given** the current step requires quantity confirmation, **When** a staff member attempts to advance without confirming the quantity, **Then** the system blocks progression and displays a clear validation message.
8. **Given** all requirements for the current step are satisfied, **When** a staff member advances to the next step, **Then** the step is marked complete and the next step becomes active.
9. **Given** all steps are completed, **When** a staff member marks the order complete, **Then** the system records the final production data and transitions the order to "Completed" status.

---

### User Story 3 - Record Production Completion Data (Priority: P2)

When all steps in a production order are completed, the system automatically captures and stores all required production completion data: the quantity produced, the start and end times, the calculated duration, the staff member(s) involved, and any evidence collected during production steps. This data becomes the permanent production record.

**Why this priority**: Completion data is the source of truth for inventory deductions, batch creation, and regulatory traceability. It must be recorded accurately and completely before any downstream processes can occur.

**Independent Test**: Can be fully tested by completing a production order end-to-end and verifying that the completion record contains all required fields: produced quantity, start time, end time, duration, assigned staff identity, and all collected evidence files.

**Acceptance Scenarios**:

1. **Given** a production order where the staff member began work, **When** the order is marked complete, **Then** the system records the exact start time (when the first step was initiated), end time (when the final step was completed), and calculated duration.
2. **Given** a completed production order, **When** a supervisor reviews it, **Then** they can see the produced quantity, the identity of the staff member(s) who worked on it, and all photos or notes collected during steps.
3. **Given** a production order is completed with quantity of zero, **When** the system attempts to save it, **Then** it requires a valid produced quantity greater than zero before finalizing.

---

### User Story 4 - Review and Trace Completed Production Orders (Priority: P2)

Supervisors and administrators can view the full history of completed production orders, including all step-level evidence, the original recipe version used, staff assignments, timestamps, and produced quantities. This provides complete operational traceability for quality audits, inventory reconciliation, and reporting.

**Why this priority**: Traceability is a non-negotiable operational and compliance requirement. Without it, the system cannot support inventory management, batch labeling, or regulatory audits.

**Independent Test**: Can be fully tested by completing a production order, then navigating to the completed orders list and drilling into the detail view to verify all traceability fields are present and accurate.

**Acceptance Scenarios**:

1. **Given** a list of completed production orders, **When** a supervisor opens a specific order, **Then** they can view the full production record including recipe version, all steps with their evidence, produced quantity, staff, start/end times, and duration.
2. **Given** a completed production order, **When** the original recipe version is archived or updated, **Then** the production order still displays the original recipe version data that was in effect at order creation.
3. **Given** a user without supervisory permissions, **When** they attempt to access another staff member's production history, **Then** the system only shows orders they are personally assigned to.

---

### User Story 5 - Downstream Processing from Completed Orders (Priority: P3)

Once a production order is completed, authorized users can initiate downstream operational processes: recording inventory consumption from the order, creating a production batch record, printing product labels, and generating production reports. The completed order serves as the traceability anchor for all these processes.

**Why this priority**: These downstream integrations multiply the operational value of the production order, but they depend entirely on the core order creation and completion flows being fully functional first.

**Independent Test**: Can be partially tested by completing a production order and verifying that the downstream action triggers (inventory consumption record, batch record creation) are available and linked back to the source production order ID.

**Acceptance Scenarios**:

1. **Given** a completed production order, **When** an authorized user triggers inventory consumption, **Then** the system records the consumption event linked to this production order as the source.
2. **Given** a completed production order, **When** an authorized user creates a batch record, **Then** the batch record is permanently linked to the production order and the recipe version used.
3. **Given** a completed production order, **When** a user requests label printing, **Then** the system generates labels containing production date, batch reference, and produced quantity from the order record.

---

### Edge Cases

- What happens when a staff member's session expires mid-production while steps are in progress? The system must resume from the last completed step when they re-authenticate.
- What happens if the photo upload fails during a step requiring photo evidence? The system must clearly indicate the failure and prevent step advancement until evidence is successfully captured.
- What happens when a recipe version is deactivated after a production order is already "In Progress"? The order must continue to completion using the locked recipe version.
- What happens if two staff members attempt to work on the same production order simultaneously? The system must prevent conflicting concurrent edits and inform the second user that the order is already in progress.
- What happens if the user enters a produced quantity that exceeds a reasonable threshold relative to the recipe's expected yield (in the inherited unit of measure)? The system must flag this as a warning requiring confirmation rather than silently accepting it.
- What happens if production needs to restart after a cancellation? Cancellation is irreversible — a supervisor must create a new production order from the same recipe. The cancelled order remains in history for audit purposes with its justification note intact.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow only authorized users to create production orders. Production Supervisors may create orders for any recipe. Production Staff may only create orders for recipes belonging to the recipe categories explicitly assigned to their account by an administrator.
- **FR-001a**: When creating a production order, the creator MAY optionally pre-assign the order to a specific eligible staff member.
- **FR-001b**: If left unassigned, the order MUST appear in a shared production queue visible to all eligible staff members, who may self-claim it.
- **FR-001c**: When a staff member self-claims an unassigned order, the system MUST immediately assign it to that staff member and remove it from the shared queue.
- **FR-002**: System MUST present only active recipe versions as selectable when creating a production order. For Production Staff, the list MUST be further filtered to include only recipes in their assigned categories.
- **FR-003**: System MUST permanently and immutably link each production order to the exact recipe version selected at creation time.
- **FR-004**: System MUST guide production staff through recipe workflow steps in the defined sequence order.
- **FR-005**: System MUST prevent staff from advancing to the next step until all requirements of the current step are satisfied.
- **FR-006**: System MUST enforce step requirements: photo evidence upload, free-text note entry, and numeric quantity confirmation, as defined per step by the recipe.
- **FR-007**: System MUST prevent staff from skipping steps, reordering steps, or marking future steps complete out of sequence.
- **FR-008**: System MUST record the production start time when either: (a) the assigned staff member explicitly taps "Start Production", or (b) the first step is completed without having used the button — whichever occurs first. Both paths MUST result in an identical and accurate start timestamp.
- **FR-009**: System MUST record the production end time when the final step is completed and the order is finalized.
- **FR-010**: System MUST automatically calculate and store production duration from start and end times.
- **FR-011**: System MUST record the identity of all staff members who performed work on the production order.
- **FR-012**: System MUST record the produced quantity entered by staff upon order completion, expressed in the unit of measure inherited from the recipe version linked to the order. Staff enter only a numeric value; the unit is fixed and displayed alongside the input field for clarity.
- **FR-013**: System MUST store all evidence collected during steps (photos, notes, quantity confirmations) as part of the production order's permanent record.
- **FR-014**: System MUST transition production order status through defined states: Pending (or Pending Unassigned) → In Progress → Completed (and optionally Cancelled with justification). The Pending → In Progress transition is triggered by either an explicit "Start Production" action or automatically upon first step completion, whichever occurs first. Cancellation is a terminal, irreversible action — a cancelled order cannot be reinstated. The cancelled record is retained permanently in history for audit and traceability purposes.
- **FR-015**: System MUST support traceability from completed production orders to downstream actions: inventory consumption records, batch records, label print events, and reports.
- **FR-016**: System MUST display production orders in a filterable, sortable list view for supervisors and administrators.
- **FR-017**: System MUST provide a detailed view of any production order showing all step-level evidence, the original recipe version, staff, timestamps, and produced quantity.
- **FR-018**: System MUST ensure that completed production order records are immutable — no historical production data may be altered after finalization.
- **FR-019**: System MUST enforce role-based access control so staff only see and act on orders assigned to them, while supervisors have broader visibility.
- **FR-020**: System MUST handle concurrent access protection to prevent two staff members from simultaneously modifying the same production order.

### Key Entities

- **Production Order**: Represents a single production run. Holds status, links to a specific recipe version, records assigned staff, timestamps (start, end, duration), produced quantity (numeric value in the unit of measure inherited from the recipe), and all step evidence. Immutable after completion.
- **Recipe Version (Reference)**: The exact snapshot of a recipe (including all steps and their requirements) that was active when the order was created. Stored by reference; production orders do not follow recipe updates.
- **Recipe Category Permission**: A configuration record linking a Production Staff member to one or more recipe categories they are authorized to produce. Managed by administrators. Determines which recipes appear in that staff member's recipe selection screen when creating orders.
- **Production Step Execution**: A record of one step being completed within a production order. Stores the step reference, completion time, staff identity, and any collected evidence (photo, note, quantity).
- **Production Evidence**: A file or text artifact captured during a production step. Linked to the step execution and the parent production order.
- **Production Batch**: A downstream record created from a completed production order, used for inventory and traceability. Linked by production order ID.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized staff can create a production order and begin executing steps within 60 seconds of selecting a recipe version.
- **SC-002**: 100% of completed production orders contain all required traceability fields: produced quantity, start time, end time, duration, staff identity, and step-level evidence.
- **SC-003**: The system enforces step sequencing with zero capability for staff to bypass a required step, confirmed by validation testing.
- **SC-004**: Supervisors can locate and open any historical production order within 10 seconds using the search and filter controls.
- **SC-005**: Completed production order records remain unmodified after finalization — zero unintentional data mutations confirmed by audit log verification.
- **SC-006**: The production order module performs all primary interactions (load order, complete step, submit order) within the platform's established performance standard of 300 ms for interactive operations.
- **SC-007**: 95% of production staff can complete an end-to-end production order (first step to finalization) without requiring supervisor assistance, based on usability testing.

## Assumptions

- Authorized user roles for production order creation are: Production Supervisor (unrestricted, all categories) and Production Staff (restricted to their assigned recipe categories). Category assignments are managed by administrators. Exact role definitions are inherited from the existing user authentication and roles system (specs/001-user-auth-roles).
- Active recipe versions and their step definitions (including step-level evidence requirements) are managed by the Recipe Management module (specs/002-recipe-management). This module consumes that data.
- Photo evidence uploaded during steps is stored using the platform's existing file/media storage infrastructure. Direct file storage configuration is out of scope for this feature.
- A production order may be pre-assigned to a staff member at creation time, or left unassigned to enter a shared queue for self-claiming by any eligible staff member. Support for reassigning an already-claimed in-progress order to a different staff member is out of scope for this initial version.
- Batch creation, label printing, and inventory consumption are downstream actions triggered from a completed production order. The internal logic of those systems is defined in their respective feature modules; this specification only covers the linkage and trigger points.
- The "Cancelled" status for a production order requires a justification note, is restricted to supervisor-level roles, and is irreversible. A cancelled order cannot be reinstated — a new production order must be created if production needs to restart. Cancellation of an in-progress order permanently discards any collected step evidence; the order record itself is retained for audit and traceability.
- Mobile browser support is included per the platform constitution (responsive design required). A dedicated native mobile app is out of scope.
- All timestamps are recorded in UTC and displayed in the user's local timezone per the platform's locale settings.
