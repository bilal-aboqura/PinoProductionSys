# Pino Production System - Product Requirements Document

**Document status:** V1 baseline  
**Version:** 1.0  
**Date:** 20 June 2026  
**Product type:** Responsive bilingual restaurant production and traceability web application  
**Primary audience:** Product, engineering, QA, operations, and automated test-generation systems

## 1. Product Summary

Pino Production System is an internal operations platform for restaurant and food-production teams. It connects controlled recipes, production execution, inventory movements, finished-product batches, labels, reports, notifications, and administrative configuration in one traceable workflow.

The product replaces disconnected spreadsheets, paper instructions, manual stock updates, and untraceable label printing. Every consequential operation must identify the actor, preserve the relevant historical state, enforce permissions and operational scope, and remain available for audit.

The V1 application is an online-only responsive web application built for desktop, tablet, and large mobile screens. It supports Arabic and English, including right-to-left Arabic layouts.

## 2. Problem Statement

Restaurant production teams need to answer five operational questions reliably:

1. What should be produced, using which approved recipe version?
2. Who completed each production step, when, and with what evidence?
3. What inventory was consumed, produced, transferred, wasted, or adjusted?
4. Which finished batch resulted, when does it expire, and how can it be traced?
5. Can managers audit, report, notify, print, and configure the operation without losing historical truth?

Today these answers may be fragmented across paper, spreadsheets, labels, and staff memory. This creates inconsistent production, inventory discrepancies, weak accountability, slow recalls, and avoidable food-safety risk.

## 3. Product Vision

Create a simple operational system in which a production order can be followed from an approved recipe through guided execution, inventory impact, finished batch creation, QR labeling, reporting, and audit review with no broken traceability links.

### 3.1 Goals

- Standardize production using immutable recipe-version snapshots and sequential steps.
- Maintain a mathematically accountable inventory ledger across warehouses.
- Generate traceable finished-product batches and scannable labels automatically.
- Give each role only the data and actions required for its work.
- Provide fast operational reporting, notifications, and audit evidence.
- Support Arabic and English workflows across common operational devices.
- Supply deterministic, testable behavior for all critical workflows and failures.

### 3.2 Non-goals for V1

- Offline operation or offline print queues.
- Direct printer protocols such as ZPL, ESC/POS, Web Serial, or native print agents.
- Raw-material lot genealogy; V1 traces output batches to inventory items and warehouses, not supplier lots.
- Custom units or administrator-defined conversion matrices.
- Editable completed production, batch, inventory-ledger, or audit records.
- External customer access to QR traceability pages.
- Automated purchasing, supplier management, payroll, or accounting.
- Physical deletion of referenced operational or master data.

## 4. Users, Roles, and Access

### 4.1 Administrator

Owns users, roles, permissions, master data, system settings, printers, templates, alert rules, and audit review. Has complete operational visibility. The last active Administrator cannot be deactivated.

### 4.2 Supervisor

Creates and oversees production, manages recipes where permitted, reviews all production and traceability details, configures operational alerts where permitted, retries print work, reviews reports, and uploads batch evidence. Supervisor rights remain permission-driven rather than assumed solely from the role name.

### 4.3 Production Staff

Views eligible recipes and assigned or claimable production orders, executes required steps, submits evidence, completes authorized orders, and views only permitted production and batch records. Recipe-category and operational scope restrictions apply.

### 4.4 Warehouse Staff

Views global stock information and performs inventory actions only for assigned warehouses. Manages permitted receipts, transfers, adjustments, waste, storage, batches, and labels.

### 4.5 Cross-cutting authorization rules

- All protected pages and server actions require an active authenticated session.
- Navigation hides unavailable modules, but the server must independently reject direct URL and action access.
- Permissions are action-level and may be configured independently.
- Scope may restrict departments, recipe categories, production lines, and inventory areas.
- Global stock visibility does not imply permission to change stock in every warehouse.
- QR links require authentication and reveal only role-authorized batch fields.
- All denied actions return a clear, non-destructive error and create no partial records.

## 5. Core Product Flows

### 5.1 Login and workspace entry

1. User selects Arabic or English and enters a username or email plus password.
2. The system validates active account status and credentials.
3. A successful login creates a database-backed session and routes the user to the permitted dashboard.
4. A temporary-password user is required to change the password before normal use.
5. The workspace shows only permitted navigation and scoped data.
6. Inactivity expires the session using the configured timeout; the next protected request returns the user to login.

### 5.2 Recipe creation and publication

1. An authorized user creates a draft with bilingual/basic details, category, yield, shelf life, storage, ingredients, and ordered steps.
2. Ingredients include quantities and units; duplicate ingredient names trigger a warning but do not block saving.
3. Steps may require a photo, note, or numeric confirmation.
4. Drafts may be incomplete and never appear in production selectors.
5. Publish validates a name, category, at least one ingredient with quantity, and at least one step.
6. Publishing makes the active version selectable within permission and scope boundaries.
7. Every save creates version/audit history. Concurrent stale saves are rejected and instruct the editor to refresh.

### 5.3 Production order lifecycle

1. An authorized creator selects an active, in-scope recipe and quantity and may assign eligible staff.
2. The system stores an immutable snapshot of the selected recipe version.
3. Unassigned orders enter a shared eligible queue; claiming is atomic so only one staff member succeeds.
4. The assignee starts production explicitly or starts implicitly by completing the first step.
5. Steps must be completed in order and all configured evidence requirements must pass validation.
6. Finalization captures produced quantity, fixed recipe unit, start/end time, duration, contributors, and evidence.
7. Completion atomically triggers inventory consumption/output and finished-batch creation.
8. Cancellation requires justification, is terminal, and preserves the complete record.

### 5.4 Inventory lifecycle

1. Administrators manage item, category, warehouse, and storage master data through activation/deactivation.
2. Users view current balances per item and warehouse and can search/filter globally if authorized for inventory.
3. Every stock change creates an immutable movement with item, warehouse, signed quantity, actor, timestamp, type, and source reference.
4. Production completion calculates consumption as recipe ingredient quantity multiplied by actual output divided by recipe target yield, applying supported unit conversions.
5. Production may create negative raw-material stock after a warning; the event is logged and flagged for reconciliation.
6. Transfers are atomic paired movements and are blocked when the source has insufficient stock.
7. Manual adjustments require a predefined reason and are blocked if they would create negative stock.
8. Waste records require a reason and remain traceable to the relevant item, warehouse, user, and source when applicable.

### 5.5 Batch, QR, and label lifecycle

1. Completing a production order automatically creates one output batch with a unique chronological identifier.
2. The batch links to the order, recipe version, contributors, production time, produced quantity, and inventory output.
3. Expiry is calculated from the recipe-version shelf-life configuration.
4. The system generates a unique authenticated traceability URL and scannable QR code.
5. Authorized users may split a batch into containers without changing the total batch quantity.
6. Approved 50x50 mm, 100x50 mm, and 100x100 mm templates show required traceability fields and configured optional fields.
7. Initial prints and reprints are logged; a reprint requires a reason.
8. Draft, deleted, disposed, or otherwise ineligible batches cannot produce active labels according to their state rules.
9. Supervisors can attach validated image/PDF evidence up to 5 MB.

### 5.6 Printing and scanning

1. An authorized user chooses an eligible product, batch, production document, recipe, or stock summary.
2. The server creates the print job/history record before presenting the printable artifact.
3. Labels render as isolated HTML/CSS or generated PDF with no application chrome; documents use A4/Letter print styles.
4. The browser's standard print dialog uses installed printer drivers.
5. Reprints require an allowed reason and create a separate immutable reprint record linked to the original target/job.
6. Keyboard-emulating USB/Bluetooth scanners send characters into a focused scanner-enabled field.
7. Completion (normally Enter or timing threshold) triggers one lookup and clears or preserves the field according to the screen workflow.
8. Printing fails safely when offline, unauthenticated, unauthorized, or missing server data.

### 5.7 Notifications and response

1. Production, inventory, warehouse, batch, and system events are evaluated against enabled alert rules.
2. Recipients are selected using role, permission, scope, and personal preferences.
3. Similar alerts within five minutes are aggregated.
4. Active users receive an unread badge and critical/high-priority toast or banner.
5. Each notification deep-links to an authorized entity page.
6. Users can mark one/all as read and archive notifications; history supports pagination and filters.

### 5.8 Reporting and audit

1. Users open a role-permitted report and apply date, warehouse, category, status, or user filters.
2. KPI cards, charts, and tables update from the same filtered dataset.
3. Drill-down preserves context from summary to transaction, order, batch, and evidence.
4. Excel and print-optimized PDF exports must contain the same rows and values as the filtered view.
5. Archived references display preserved historical names/codes.
6. Audit views support date/user/action/entity filtering and never permit modification or deletion.

## 6. Functional Requirements by Module

### 6.1 Authentication, users, and audit

- Support unique username and email login identifiers and securely hashed passwords.
- Support create, view, edit, activate/deactivate, temporary-password reset, roles, permissions, and scopes.
- Prevent deactivation of the last active Administrator.
- Enforce inactivity timeout and active-session checks.
- Record actor, time, action, entity, entity ID, and relevant before/after data for administrative and operational changes.
- Provide searchable, paginated user and audit lists.

### 6.2 Recipes

- Support Draft, Active, and Archived lifecycle states.
- Preserve an immutable version snapshot on every save and on every linked production order.
- Support categories, ingredients, units, target yield, shelf life, storage instructions, ordered steps, and evidence requirements.
- Filter recipe lists by name, category, and state.
- Archived recipes are excluded from new orders but remain available in historical records.
- Archiving with active orders requires a warning and explicit confirmation; existing orders continue from their snapshots.
- Restore is Administrator-only unless an explicit permission grants otherwise.

### 6.3 Production orders

- Support Pending Unassigned, Pending/Assigned, In Progress, Completed, and Cancelled states.
- Restrict state transitions and make Completed/Cancelled terminal.
- Enforce assignment eligibility, atomic self-claim, sequential steps, and optimistic/concurrent update protection.
- Validate photo, note, and numeric evidence at the relevant step.
- Record all contributors and status history.
- Provide searchable/sortable lists and complete trace detail.

### 6.4 Inventory

- Maintain items, warehouses, balances, movement ledger, transfers, adjustments, waste, consumption, and output.
- Supported static units are KG, Gram, Liter, Milliliter, and Piece, with compatible conversions only.
- Preserve `balance = sum(movements)` for each item/warehouse.
- Apply the hybrid negative-stock policy: warn/allow production; block insufficient transfer; block negative manual adjustment.
- Pair transfer-out and transfer-in within one database transaction.
- Prevent deletion of referenced items/warehouses and retain inactive metadata in history.

### 6.5 Batches

- Generate exactly one unique output batch per completed order/partial run under V1 rules.
- Calculate expiry from production time and recipe snapshot.
- Support status history, containers, evidence, disposal, QR, labels, and print history.
- Preserve quantity conservation during splits and disposal accounting.
- Search by batch number and scan payload; provide responsive traceability views.

### 6.6 Printing and devices

- Support thermal label sizes 50x50 mm, 100x50 mm, and 100x100 mm.
- Support printable recipe, production-order, and stock-summary documents on A4/Letter.
- Configure printers, default templates, printable fields, QR size, and QR error correction.
- Generate QR payloads with batch ID, recipe/product code, production date, expiry, weight/quantity, and trace URL.
- Track queued, processing, completed, and failed print states where applicable.
- Record all initial prints and reprints indefinitely; reasons are mandatory for reprints.
- Accept scanners only through keyboard emulation in V1.

### 6.7 Reports

- Provide production, inventory, warehouse movement, batch traceability, waste, staff performance, and audit reports.
- Dashboard KPIs include completed orders, batches created, and low-stock alerts, with production/inventory trends.
- Support global filters, table sorting/text filtering, drill-down, pagination, Excel, PDF, and scheduled archives where enabled.
- Production Staff see their own activity; Warehouse Staff see inventory reports; Supervisors/Admins see broader reports subject to permissions.

### 6.8 Notifications

- Generate role-relevant event notifications with category, severity, message, time, and deep link.
- Provide unread counter, recent list, critical toast/banner, history, read/unread actions, archive, preferences, and alert-rule configuration.
- Deliver only authorized links/data and aggregate duplicates within five minutes.

### 6.9 Settings and master data

- Restrict settings to Administrator/System Manager permissions.
- Manage localized departments, production lines, recipe/inventory categories, warehouses, storage conditions, waste/adjustment reasons, label templates, and supported preferences.
- Require English and Arabic names for localized master data.
- Deactivate referenced values rather than deleting them.
- Apply configuration without application restart and audit every change with before/after values.
- Keep unit definitions and the hybrid negative-stock policy fixed in V1.

## 7. Business Rules and Data Integrity

- Historical truth takes precedence over current master data. Snapshots and preserved display metadata must survive edits and deactivation.
- A completed production order, stock movement, completed print history entry, batch audit entry, and system audit entry is immutable.
- Multi-record operations such as order completion, inventory output/consumption, batch creation, and warehouse transfer are transactional.
- Retrying a failed request must not duplicate production completion, batches, movements, or print audit entries.
- All quantities must be positive where the action describes an amount; movement direction is represented explicitly or by controlled signed deltas.
- Dates are stored consistently and displayed in the selected locale/time zone.
- Search, scan, and deep-link results must obey the same RBAC and scope rules as normal navigation.
- User-visible validation must identify the field or rule and preserve entered data when safe.

## 8. Information Architecture

- `/[locale]/login`: authentication.
- `/[locale]/dashboard`: role-aware operational overview.
- `/[locale]/recipes`: recipes, editor, versions, categories, and recipe audit.
- `/[locale]/production`: orders, new order, shared queue, execution detail, and cancellation.
- `/[locale]/inventory`: stock, items, warehouses, transfers, adjustments, waste, history, batches, and batch trace detail.
- `/[locale]/printing`: print queue/history and reprint actions.
- `/[locale]/printing/label/[id]`: isolated print-ready label.
- `/[locale]/reports`: dashboard and production, inventory, warehouse, batch, waste, staff, audit, and scheduled reports.
- `/[locale]/notifications` and `/[locale]/profile/notifications`: notification history and preferences.
- `/[locale]/admin/users`, `/admin/audit`, `/admin/printers`, `/admin/alert-rules`, `/admin/settings`: administration.

## 9. UX and Localization Requirements

- Arabic is supported with correct RTL direction; English uses LTR. Content, forms, tables, dialogs, pagination, icons, and print layouts must remain usable in both.
- Desktop, tablet, and large-mobile layouts must not overlap, clip, or require unintended horizontal scrolling.
- Primary operational actions use clear states: idle, loading, success, validation error, permission denied, conflict, and retryable failure.
- Destructive or terminal actions require confirmation and explain impact.
- Empty states state why no data is visible and provide an allowed next action.
- Print layouts hide navigation, controls, search inputs, sidebars, and non-print UI.
- Scanner workflows make focus visible and prevent ordinary typing from triggering premature lookup.
- Accessibility baseline: keyboard navigation, programmatic labels, sensible focus order, visible focus, semantic headings/tables, and adequate contrast.

## 10. Non-functional Requirements

### 10.1 Performance

- Login completes in under 30 seconds for a normal user journey.
- Interactive production operations target 300 ms server/action response under normal load.
- Stock dashboard loads within 1 second for at least 10,000 movement records.
- Reports load within 3 seconds; filters update within 500 ms; common UI interactions respond within 300 ms.
- Label generation completes within 2 seconds, PDF rendering within 3 seconds, print-job creation within 1 second, and print history search within 500 ms.
- Active-user notifications arrive within 2 seconds; UI badge/toast updates within 500 ms after receipt.

### 10.2 Security and privacy

- Enforce authentication, RBAC, scopes, and default-deny server-side checks.
- Store no plaintext passwords or sensitive credentials in logs/client bundles.
- Validate and constrain uploads by type and size; generate non-guessable storage references.
- Apply database row-level protections where configured and use privileged server access only in controlled server paths.
- Do not expose batch or operational data through public QR URLs.

### 10.3 Reliability and auditability

- Critical transactional operations are atomic and idempotent.
- Audit and operational history are retained indefinitely in V1.
- Errors never silently discard evidence or partially update a workflow.
- Exported data equals the filtered source data exactly.
- QR codes must be scannable by common smartphones and warehouse scanners.

### 10.4 Compatibility

- Support current mainstream Chromium, Firefox, and Safari browser behavior used by the organization.
- Browser printing depends on installed operating-system printer drivers.
- Scanner support assumes keyboard-emulation mode and a terminator such as Enter.

## 11. Analytics and Success Measures

- Completed production orders with all required traceability fields: 100%.
- Completed orders producing exactly one valid output batch: 100%.
- Stock movements with actor, timestamp, type, and source reference: 100%.
- Unauthorized direct-route/action attempts blocked: 100%.
- Administrative and print actions represented in immutable audit/history: 100%.
- Batch traced to recipe version, staff, and evidence in under 10 seconds.
- Batch label generated and ready to print in under 5 seconds after production completion.
- Report exports match filtered UI row counts and values: 100%.
- QR scan resolves to the correct authorized record within 2 seconds.
- At least 95% of trained production staff complete a full order without supervisor assistance.

## 12. Test Strategy and Critical Scenarios

### 12.1 Authentication and authorization

- Valid username and valid email login; invalid password; inactive user; temporary password; expired session.
- Each role's visible navigation and allowed pages/actions in Arabic and English.
- Direct URL and server-action denial for every restricted role.
- Scope combinations, no-scope defaults, and last-Administrator protection.

### 12.2 Recipe and production

- Save incomplete draft; publish minimum valid recipe; reject invalid publish.
- Version creation, stale-edit conflict, archive warning, restore, and historical snapshot display.
- Assigned order, unassigned queue, simultaneous claim, explicit/implicit start, each evidence type, skipped-step attempt, duplicate completion retry, cancellation, and completed-record immutability.

### 12.3 Inventory and batches

- Correct production ratio and unit conversion; incompatible-unit block.
- Production negative-stock warning/allow; transfer insufficient-stock block; adjustment negative-stock block.
- Atomic transfer rollback and ledger/balance reconciliation.
- Batch ID uniqueness, expiry calculation, QR authorization, split quantity conservation, evidence validation, disposal, and inactive-state restrictions.

### 12.4 Printing and scanners

- Every label size and A4/Letter print CSS in supported locales and browsers.
- Initial print, mandatory reprint reason, unauthorized print/retry/configuration, failed job, duplicate request, and immutable history.
- Offline/session-expired print rejection and missing/deleted target handling.
- Scanner fast input, manual typing, missing terminator, unknown code, repeated scan, focus loss, Arabic/English route, and one-lookup-per-scan behavior.

### 12.5 Reports, notifications, and settings

- Filter consistency across KPI/chart/table/export and server-side pagination boundaries.
- Role-limited staff reports, archived metadata, empty datasets, and large datasets.
- Notification routing, aggregation window, unread counts, mark all, archive, preferences, deep-link authorization, and high-load delivery.
- Localized master data validation, referenced-value deactivation, fixed-policy protection, immediate propagation, and before/after audit payloads.

### 12.6 Quality gates

- Type checking, linting, unit tests, integration tests, and end-to-end tests pass.
- No critical/high security or data-integrity defects remain open.
- Responsive and bilingual visual checks pass on agreed viewport/browser matrix.
- Print artifacts and QR codes pass physical-device verification.
- Database migrations and seed data succeed in a clean environment.

## 13. Dependencies and Constraints

- Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn-style components, next-intl.
- Auth.js database sessions and Prisma 5.22 with PostgreSQL/Supabase.
- QR generation through `qrcode`; PDFs through PDFKit; Excel through ExcelJS.
- Vitest for unit/integration tests and Playwright for browser workflows.
- Active network, valid session, server/database availability, installed printer driver, and keyboard-mode scanner are required for the relevant V1 workflows.

## 14. Risks and Mitigations

- **Browser print variation:** maintain isolated print routes, explicit page sizes, browser/device test matrix, and printable PDF fallback where supported.
- **Concurrent operational updates:** use transactions, state preconditions, optimistic locking, and idempotency checks.
- **Inventory drift:** make the movement ledger authoritative and continuously reconcile balances to movement sums.
- **Permission leakage:** share server-side permission/scope resolvers across pages, actions, exports, scans, and deep links.
- **Notification fatigue:** aggregate duplicates and respect role and personal preferences.
- **Historical inconsistency:** snapshot recipe/order data and retain deactivated reference metadata.
- **Bilingual layout defects:** test mirrored layouts, long translations, tables, dialogs, printed output, and narrow viewports.

## 15. Release Scope and Acceptance

V1 is acceptable for release when the nine modules operate as one traceable workflow: a permitted user can authenticate, publish a recipe, create and execute a production order, post correct inventory movements, receive a finished batch, generate and audit a scannable label, find the result through reports/notifications, and review immutable history. The same workflow must enforce role and scope restrictions, survive retry/concurrency cases without duplicates, and work in Arabic and English on the agreed responsive/browser/device matrix.

## 16. Open Product Decisions

- Final configured inactivity timeout and whether different roles require different values.
- Exact browser and physical printer/scanner certification matrix.
- Final batch-number format, since specifications show both date-based and year-sequence examples.
- Exact low-stock threshold ownership when item-level and global settings both exist.
- Whether scheduled reports are enabled for V1 operations or shipped behind permission/configuration.
- Data-retention policy for uploaded evidence versus indefinite audit metadata.
- Recovery workflow for failed print jobs when the browser dialog opens but physical printing cannot be confirmed.

## 17. Source of Truth

This PRD consolidates feature specifications `001` through `009`, the current implementation plan at `specs/009-printing-device-integration/plan.md`, repository routes, Prisma models, and the project README. Detailed feature specs and contracts remain authoritative for implementation-level field definitions when they are more specific than this cross-product document.
