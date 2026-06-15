# Tasks: Printing and Device Integration

**Input**: Design documents from `/specs/009-printing-device-integration/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are requested by the PinoProductionSys Constitution (Standard VIII) for all business logic, end-to-end integration, and role permissions.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Exact file paths are included in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure for printing feature in `src/features/printing`
- [ ] T002 Define Zod validation schemas for printing configuration, print jobs, and reprints in `src/features/printing/validation.ts`
- [ ] T003 [P] Define TypeScript interfaces and DTOs in `src/features/printing/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database tables and shared queries that must be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Update `prisma/schema.prisma` with Printer, PrintTemplate, PrintJob, PrintHistory, PrintReprint models, and print-related AuditAction enums
- [ ] T005 Run Prisma database migration `npx prisma migrate dev` to apply schema updates
- [ ] T006 Update seed script in `prisma/seed.ts` with initial print templates (50x50mm, 100x50mm, 100x100mm) and default printer settings
- [ ] T007 Implement Prisma database query utility functions in `src/features/printing/queries.ts`
- [ ] T008 [P] Configure RBAC printing permission checks and route exports in `src/lib/permissions.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Thermal Label Printing for Batches & Products (Priority: P1) 🎯 MVP

**Goal**: Print localized labels with batch details, expiry, and QR code to thermal printers.

**Independent Test**: Print a standard batch label from UI, check browser print dialog preview scaling, and verify QR scans to correct URL.

### Tests for User Story 1
- [ ] T009 [P] [US1] Create Playwright integration tests for thermal label printing and layout scaling in `tests/integration/thermal-printing.spec.ts`

### Implementation for User Story 1
- [ ] T010 [US1] Implement Server Action to queue a print job and format its payload (`createPrintJob`) in `src/features/printing/actions.ts`
- [ ] T011 [US1] Build print-ready isolated HTML label template page for bare rendering in `src/app/[locale]/printing/label/[id]/page.tsx`
- [ ] T012 [US1] Build standard `@media print` CSS utility formatting for 50x50mm, 100x50mm, and 100x100mm dimensions in `src/app/[locale]/printing/label/[id]/print.css`
- [ ] T013 [US1] Implement server-side QR code data string generation using `qrcode` library in `src/features/printing/actions.ts`
- [ ] T014 [US1] Integrate "Print Label" action button on the batch details view page

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Operational Document Printing (Priority: P1)

**Goal**: Print recipes, production order sheets, and stock summaries on A4 document printers.

**Independent Test**: Trigger print on a production order, verify print CSS hides navbars/sidebars, and verify text readability.

### Tests for User Story 2
- [ ] T015 [P] [US2] Create Playwright integration tests for A4 operational document print styles in `tests/integration/document-printing.spec.ts`

### Implementation for User Story 2
- [ ] T016 [US2] Implement print-specific CSS stylesheets to hide headers, navbars, and buttons in A4 printouts in `src/styles/print-document.css`
- [ ] T017 [US2] Add "Print Summary" action buttons on Production Order sheets and stock dashboards

**Checkpoint**: User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - Label & Printer Configuration (Priority: P2)

**Goal**: Manage printer hardware records and template dimensions in settings.

**Independent Test**: Modify default printer selection and label templates, check if default templates dynamically update print page dimensions.

### Tests for User Story 3
- [ ] T018 [P] [US3] Create unit tests for printer schema configuration validations in `src/features/printing/__tests__/validation.test.ts`
- [ ] T019 [P] [US3] Create Playwright integration tests for printer configuration management in `tests/integration/printer-config.spec.ts`

### Implementation for User Story 3
- [ ] T020 [US3] Implement Server Actions for printer configurations (`savePrinterConfig`, `deletePrinterConfig`) in `src/features/printing/actions.ts`
- [ ] T021 [US3] Build the Printer Management CRUD page with add/edit dialogs in `src/app/[locale]/(protected)/admin/printers/page.tsx`

**Checkpoint**: User Stories 1, 2, and 3 are fully functional and testable.

---

## Phase 6: User Story 4 - Auditing and Reprint Tracking (Priority: P2)

**Goal**: Enforce reprint reason prompts and maintain print audit trails.

**Independent Test**: Perform a label reprint, verify reason prompt input, check reprint records, and check immutable log.

### Tests for User Story 4
- [ ] T022 [P] [US4] Create Playwright integration tests for reprint logging and role-based permissions in `tests/integration/reprint-audit.spec.ts`

### Implementation for User Story 4
- [ ] T023 [US4] Implement Server Action to log reprint authorization and reasons (`recordReprint`, `updatePrintJobStatus`) in `src/features/printing/actions.ts`
- [ ] T024 [US4] Build the print queue and history search dashboard in `src/app/[locale]/(protected)/printing/page.tsx`
- [ ] T025 [US4] Build a reprint reason dialog prompt component in `src/app/[locale]/(protected)/printing/components/ReprintDialog.tsx`

**Checkpoint**: All user stories are independently functional and auditable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Scanner keypress handling, responsive layouts, and quickstart checks

- [ ] T026 Build a global keyboard-emulation scanner hook (`useKeyboardScanner`) to capture scanned input and trigger lookups in `src/hooks/useKeyboardScanner.ts`
- [ ] T027 [P] Implement Playwright integration tests for keyboard-emulation barcode scanners in `tests/integration/scanner-integration.spec.ts`
- [ ] T028 Integrate `useKeyboardScanner` hook in global layout headers and search forms
- [ ] T029 Run the Quickstart validation scenarios listed in `specs/009-printing-device-integration/quickstart.md`
- [ ] T030 Perform final code linting and type checks in `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all subsequent phases.
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel if multiple developers are assigned, or sequentially in priority order.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories.
- **User Story 2 (P1)**: Can start after Phase 2 - Independent of US1.
- **User Story 3 (P2)**: Can start after Phase 2 - Independent of US1/US2.
- **User Story 4 (P2)**: Can start after Phase 2 - Logs changes from US1, US2, and US3, but uses a decoupled logging implementation.

### Parallel Opportunities

- Setup tasks `T001` - `T003` can run in parallel.
- Foundational helper check `T008` can run in parallel with query development.
- Playwright integration tests `T009`, `T015`, `T019`, and `T022` can be written in parallel.
- User Stories 1 and 2 can be developed concurrently by separate developers once the foundational database/query layers are complete.

---

## Parallel Example: User Story 1

```bash
# Launch print-ready label styles and integration tests:
Task: "Create Playwright integration tests for thermal label printing and layout scaling in tests/integration/thermal-printing.spec.ts"

# Develop backend action methods simultaneously:
Task: "Implement Server Action to queue a print job and format its payload (createPrintJob) in src/features/printing/actions.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - database migrations & seed scripts).
3. Complete Phase 3: User Story 1 (Thermal batch label printing).
4. Complete Phase 4: User Story 2 (A4 operational document sheets).
5. **STOP and VALIDATE**: Run manual tests for label previews and print styles.

### Incremental Delivery

1. Complete Setup + Foundational → Database is ready.
2. Add User Story 1 & 2 → Verify batch label previews and document CSS styling → Deploy/Demo (MVP!).
3. Add User Story 3 → Integrate printer management config table → Deploy/Demo.
4. Add User Story 4 → Integrate print queue, history table, and reprint dialogs → Deploy/Demo.
5. Apply polish and run quickstart verification scenarios.
