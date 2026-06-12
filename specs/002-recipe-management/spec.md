# Feature Specification: Recipe Management Module

**Feature Branch**: `002-recipe-management`  
**Created**: 2026-06-12  
**Status**: Draft  
**Input**: User description: "Build a recipe management module for a restaurant production management platform."

## Clarifications

### Session 2026-06-12

- Q: When two users open the same recipe for editing simultaneously and both try to save, how should the system respond? → A: Optimistic locking with rejection — the second save is rejected with an error ("Recipe was modified since you opened it — please refresh and re-apply your changes"); no overwrite occurs.
- Q: What actions can Supervisors perform vs. Administrators within recipe management? → A: Fully configurable per deployment — the system exposes granular permission toggles for each recipe action (create, edit, archive, restore, manage categories, assign scope); default role assignments are defined by the platform permission system, not hardcoded in this feature.
- Q: Should recipes support a Draft state where they are saved but not yet available for production orders? → A: Yes — Draft + Publish workflow. Recipes are saved as Draft by default. An explicit Publish action promotes a recipe to Active, making it selectable for production orders. Draft recipes are invisible to production order selectors.
- Q: When an admin archives a recipe currently used by in-progress production orders, what should happen? → A: Allow archiving with warning — the system displays a warning listing all in-progress orders referencing that recipe before confirming. The archive proceeds after confirmation. All in-progress orders continue to completion using the recipe data frozen at the time each order was created.
- Q: Should the same ingredient name be allowed to appear more than once in the same recipe's ingredient list? → A: Allow duplicates with a soft warning — the system permits repeated ingredient names but surfaces a non-blocking notice ("This ingredient appears multiple times — is this intentional?") to prevent accidental data entry errors.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Publish a New Recipe (Priority: P1)

An administrator or authorized supervisor opens the recipe management section and creates a new recipe from scratch. They enter the recipe name, assign a category (e.g., Dough, Sauce, Dessert, Prepared Food), fill in production instructions, add one or more ingredients with their exact quantities, define the ordered workflow steps, specify storage requirements, and set the expected shelf life. Once satisfied, they publish the recipe, making it available for selection in production orders.

**Why this priority**: Recipe creation is the core capability of the module. Without it, no other functionality has value. This story alone delivers a working recipe catalog.

**Independent Test**: Can be tested by logging in as an authorized user, navigating to Recipes, saving an incomplete recipe as Draft, verifying it does not appear in the production order selector, then completing and publishing it, and confirming it becomes selectable.

**Acceptance Scenarios**:

1. **Given** an authorized user submits a recipe creation form, **When** the form is saved without publishing, **Then** the recipe is stored with status "Draft" and does not appear in production order recipe selectors.
2. **Given** a Draft recipe exists, **When** an authorized user clicks "Publish" and all required fields are complete, **Then** the recipe status changes to "Active" and it becomes selectable for new production orders.
3. **Given** a Draft recipe exists, **When** an authorized user attempts to publish it with required fields missing (name, category, at least one ingredient with quantity, at least one workflow step), **Then** the system highlights the missing fields and prevents publishing.
4. **Given** a recipe is being created, **When** the user adds multiple ingredients with quantities, **Then** each ingredient is stored with its name, unit of measure, and quantity, and all are displayed on the recipe detail view.
5. **Given** a recipe is being created, **When** the user defines workflow steps in a specific order, **Then** the steps are persisted in that order and display sequentially on the recipe detail view.

---

### User Story 2 - Edit an Existing Recipe with Change History (Priority: P2)

An authorized supervisor needs to update an existing recipe — adjusting ingredient quantities, revising a workflow step, or changing storage conditions. After saving changes, the system preserves a historical record of the previous version so that past production orders tied to the old recipe version remain traceable and auditable.

**Why this priority**: Recipes evolve over time. Traceability is a regulatory and operational requirement — without version history, the platform cannot be a reliable source of truth for past production.

**Independent Test**: Can be tested by editing a recipe field, saving, and verifying that the recipe detail shows the updated values while a version history section lists the previous state with a timestamp and the identity of who made the change.

**Acceptance Scenarios**:

1. **Given** an active recipe exists, **When** an authorized user edits any field and saves, **Then** the recipe reflects the new values and a history entry is created recording what changed, when, and by whom.
2. **Given** a recipe has been modified, **When** a user views the recipe's history, **Then** they can see all previous versions in reverse-chronological order with the change author and timestamp.
3. **Given** a production order was created using recipe version N, **When** the recipe is later updated to version N+1, **Then** the historical production order still references and can display version N.
4. **Given** a user without edit permissions, **When** they view a recipe, **Then** no edit controls are visible and any direct edit attempt is rejected.

---

### User Story 3 - Archive a Recipe (Priority: P2)

An administrator archives a recipe that is no longer in active use (e.g., a discontinued product). The archived recipe disappears from the selection list for new production orders but remains fully accessible for reviewing historical production records that referenced it.

**Why this priority**: Operational hygiene requires keeping the active recipe list clean without destroying historical data. Archiving must not break past records.

**Independent Test**: Can be tested by archiving a recipe and verifying it no longer appears in the "create production order" recipe selector, while the recipe detail page and its associated historical production records remain fully viewable.

**Acceptance Scenarios**:

1. **Given** an active recipe, **When** an admin archives it, **Then** its status changes to "Archived" and it is removed from all new production order recipe selectors.
2. **Given** an active recipe is referenced by one or more in-progress production orders, **When** an admin initiates archiving, **Then** the system displays a warning listing all affected in-progress orders and requires explicit confirmation before proceeding.
3. **Given** an admin confirms archiving of a recipe with in-progress orders, **When** the archive is applied, **Then** all in-progress orders that referenced it continue to completion using the recipe data frozen at the time each order was created.
4. **Given** an archived recipe, **When** a user views historical production records that used that recipe, **Then** the full recipe details (as they were at time of production) are still accessible.
5. **Given** an archived recipe, **When** an admin searches or browses the recipe list with the "Archived" filter, **Then** the archived recipe appears in results.
6. **Given** an archived recipe, **When** an admin needs to reinstate it, **Then** they can restore it to "Active" status, making it selectable again for new production orders.

---

### User Story 4 - Assign Recipe Scope to Departments, Lines, or Users (Priority: P3)

An administrator scopes a recipe to one or more departments, production lines, or specific users, ensuring that only authorized personnel and workflows can select and execute that recipe in production orders.

**Why this priority**: Access scoping is important for multi-department kitchens, but the recipe catalog itself can function before scoping is fully enforced. Scope assignments enhance governance rather than enabling core functionality.

**Independent Test**: Can be tested by assigning a recipe to Department A only, then logging in as a user from Department B and verifying the recipe does not appear in their available recipe list, while a Department A user can see and select it.

**Acceptance Scenarios**:

1. **Given** a recipe is created, **When** an admin assigns it to specific departments or production lines, **Then** only users associated with those departments or lines can select the recipe for production orders.
2. **Given** a recipe is scoped to specific users, **When** an unscoped user attempts to use the recipe, **Then** it does not appear in their recipe selector and any direct access attempt is blocked.
3. **Given** no scope assignments are made, **When** any authorized user browses recipes, **Then** unscoped recipes are accessible to all authorized roles (default open access).

---

### Edge Cases

- When two supervisors attempt to edit the same recipe simultaneously, the system uses optimistic locking: the first save succeeds; the second save is rejected with a conflict error prompting the user to refresh and re-apply their changes.
- How does the system handle a recipe that is referenced in an in-progress production order when the recipe is archived mid-process? The system warns the user with a list of affected in-progress orders before confirming the archive. Once confirmed, the archive proceeds and in-progress orders continue unaffected using their frozen recipe snapshot.
- What happens if an ingredient name is duplicated within the same recipe? The system permits the duplicate but surfaces a non-blocking warning ("This ingredient appears multiple times — is this intentional?") so the user can confirm intent or merge the entries before saving.
- How does the system behave if all workflow steps are deleted from an Active recipe during an edit? (The recipe cannot revert to a valid published state without steps — the system should warn before saving and prevent publishing in that state.)
- What happens if the shelf life value entered is zero or negative?
- How does scope assignment behave when a department or production line is deleted from the system?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users with Administrator or Supervisor roles to create new recipes containing basic information, production instructions, ingredients with quantities, ordered workflow steps, storage requirements, and shelf life.
- **FR-002**: System MUST allow recipes to be saved at any time as "Draft" without requiring all fields to be complete. System MUST require a recipe name, at least one category assignment, at least one ingredient with a quantity, and at least one workflow step before a Draft recipe can be Published (promoted to Active).
- **FR-003**: System MUST provide a defined set of recipe categories (Dough, Sauce, Dessert, Prepared Food) and allow administrators to manage this category list over time.
- **FR-004**: System MUST allow authorized users to edit any field of an existing active recipe and save the changes.
- **FR-005**: System MUST automatically record a versioned history entry on every recipe save event, capturing the previous state, a timestamp, and the identity of the editing user.
- **FR-006**: System MUST allow administrators to archive active recipes, changing their status to Archived.
- **FR-007**: System MUST prevent archived recipes from appearing in recipe selectors used when creating new production orders.
- **FR-008**: System MUST retain all archived recipe data and keep it accessible for historical production record review.
- **FR-009**: System MUST allow administrators to restore an archived recipe to Active status.
- **FR-010**: System MUST allow administrators to assign recipe scope to one or more departments, production lines, or individual users.
- **FR-011**: System MUST enforce scope assignments so that users outside the assigned scope cannot select the recipe for new production orders.
- **FR-012**: System MUST treat recipes with no scope assignments as accessible to all authorized users by default.
- **FR-013**: System MUST display a recipe's full version history to authorized users, listing each version in reverse-chronological order with author and timestamp.
- **FR-014**: System MUST allow historical production records to display the exact recipe version (including ingredients and workflow steps) that was in use at the time of production.
- **FR-015**: System MUST enforce recipe action permissions (create, edit, archive, restore, manage categories, assign scope) through the platform's existing configurable permission system rather than hardcoding role-to-action mappings; each action MUST be independently toggle-able per role or user group.
- **FR-016**: System MUST allow users to search and filter the recipe list by name, category, and status (Active / Archived).
- **FR-017**: System MUST implement optimistic locking on recipe edits — if a user attempts to save a recipe that has been modified by another user since it was opened, the save MUST be rejected with a clear conflict message instructing the user to refresh before re-applying changes.
- **FR-018**: System MUST support a Draft → Active lifecycle transition via an explicit Publish action. Draft recipes MUST NOT appear in any production order recipe selector. Only recipes in Active status are selectable for new production orders.
- **FR-019**: System MUST detect in-progress production orders referencing a recipe when an archive action is initiated. If any exist, the system MUST display a warning listing the affected orders and require explicit user confirmation before completing the archive. Once archived, all affected in-progress orders MUST continue to completion using the recipe data snapshot captured at order creation time.
- **FR-020**: System MUST allow the same ingredient name to appear more than once within a recipe's ingredient list. When a duplicate ingredient name is detected during editing or saving, the system MUST surface a non-blocking warning ("This ingredient appears multiple times — is this intentional?") without preventing the save.

### Key Entities

- **Recipe**: The central entity representing a standardized production procedure. Key attributes: name, description, category, status (Draft/Active/Archived), production instructions, storage requirements, shelf life, created-by, created-at, last-modified-by, last-modified-at. Lifecycle: Draft → Active (via Publish) → Archived → Active (via Restore).
- **RecipeVersion**: An immutable snapshot of a Recipe at a point in time. Attributes: recipe reference, version number, full data snapshot, changed-by, changed-at, change summary.
- **RecipeIngredient**: An ingredient line within a recipe. Attributes: ingredient name, quantity, unit of measure, notes.
- **RecipeWorkflowStep**: An ordered step in the production process. Attributes: step order, title, instructions, estimated duration.
- **RecipeCategory**: A classification label for recipes. Attributes: name, description.
- **RecipeScope**: An access control assignment linking a recipe to a department, production line, or individual user. Attributes: recipe reference, scope type (Department / ProductionLine / User), scope target identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users can create a complete recipe — including ingredients and workflow steps — in under 5 minutes from opening the recipe form.
- **SC-002**: Recipe changes are reflected in the system and visible to other users within 5 seconds of being saved.
- **SC-003**: 100% of historical production records continue to display the correct recipe version (ingredients, steps, quantities) even after the recipe has been subsequently modified or archived.
- **SC-004**: Archived recipes are absent from all new production order recipe selectors within 1 second of being archived, with no page refresh required.
- **SC-005**: Scope-restricted recipes are invisible to out-of-scope users in all recipe selection interfaces — zero unauthorized recipe selections are possible.
- **SC-006**: The complete version history of any recipe is retrievable and fully readable within 3 seconds, regardless of how many versions exist.
- **SC-007**: 90% of administrators and supervisors can locate, create, and publish a recipe without requiring documentation or support assistance.

## Assumptions

- The platform already has an authentication and role management system in place; this feature will integrate with existing Administrator and Supervisor roles rather than defining new ones.
- Departments, production lines, and user accounts are managed by a separate module and will be available as reference data for scope assignments.
- A single recipe belongs to exactly one category; multiple categories per recipe are out of scope for this version.
- Ingredient names are free-text for flexibility; a centralized ingredient registry or inventory linkage is out of scope for this version.
- Recipe workflow steps are independent procedural instructions and are not yet linked to automated equipment, timers, or IoT systems in this version.
- Mobile support is considered a secondary concern; the primary interface is a desktop/tablet browser.
- Version history is append-only; no deletion or rollback of individual history entries is supported.
- Recipe action permissions (create, edit, archive, restore, manage categories, assign scope) are each independently configurable via the platform permission system. No role-to-action mapping is hardcoded in this feature; default role assignments are governed by the platform constitution.
