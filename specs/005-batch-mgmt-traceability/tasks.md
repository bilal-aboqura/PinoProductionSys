# Tasks: Batch Management, QR Code, and Label Printing

**Input**: Design documents from `/specs/005-batch-mgmt-traceability/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

---

## Format: `[ID] [P?] [Story] Description`

* **[P]**: Can run in parallel (different files, no dependencies)
* **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5)
* Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and configuring shared libraries.

- [ ] T001 Configure Tailwind CSS printing utilities in `tailwind.config.ts` and add print media styles in `src/app/globals.css`
- [ ] T002 Install the `qrcode` npm package and its types `@types/qrcode` in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema migrations and core helper utilities.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 Update `prisma/schema.prisma` to add the `BatchStatus` enum and models: `ProductionBatch`, `BatchContainer`, `BatchQrCode`, `BatchLabel`, `BatchStatusHistory`, `BatchPrintHistory`, `BatchDisposal`, and `BatchAuditLog`
- [ ] T004 Run Prisma migrations and regenerate the Prisma client using `npx prisma migrate dev`
- [ ] T005 [P] Implement year-padded sequence number generation helper (`B-YYYY-NNNNN`) in `src/features/batches/utils.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Automatic Batch Generation (Priority: P1) 🎯 MVP

**Goal**: Automatically generate a unique `B-YYYY-NNNNN` batch record when a production order is completed, including shelf-life expiry calculation.

**Independent Test**: Complete a production order and verify that a sequential batch is created in the database containing the correct snapshotted recipe version, produced quantity, and calculated expiry date.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Create Zod validation schemas for batch creation in `src/features/batches/validation.ts`
- [ ] T007 [P] [US1] Define batch DTOs and return interfaces in `src/features/batches/types.ts`
- [ ] T008 [US1] Implement `createBatchFromOrder` server action in `src/features/batches/actions.ts` that creates the batch and appends the initial `BatchStatusHistory` and `BatchAuditLog` entries
- [ ] T009 [US1] Hook the `createBatchFromOrder` handler into the production order completion flow inside `src/features/production-orders/actions.ts`
- [ ] T010 [P] [US1] Implement unit tests for sequence generation, expiry date calculation, and order completion integration in `src/features/batches/__tests__/actions.test.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Label Printing & QR Code Generation (Priority: P1)

**Goal**: Support compiling and printing predefined label templates (Small, Standard, Large) with a generated QR code, and support container-based splitting.

**Independent Test**: Request a label preview for a batch/container, verify the QR code loads as a Base64 image, and trigger a print request. Verify reprint tracking prompts for a reason and writes to print history.

### Implementation for User Story 2

- [ ] T011 [P] [US2] Implement QR code generation utility (URL encoding to Base64 image) in `src/features/batches/qr.ts`
- [ ] T012 [P] [US2] Implement `printBatchLabelAction` server action to generate snapshots and write print logs in `src/features/batches/actions.ts`
- [ ] T013 [US2] Implement batch container split logic (creating child `BatchContainer` records with sequence suffixes) in `src/features/batches/actions.ts`
- [ ] T014 [US2] Build CSS print template layouts for Small (50x50mm), Standard (100x50mm), and Large (100x100mm) inside `src/app/[locale]/(protected)/inventory/batches/_components/LabelPrintLayout.tsx`
- [ ] T015 [US2] Create the Label Print modal dialog (handling template choice, print preview, reprint reason collection) in `src/app/[locale]/(protected)/inventory/batches/_components/LabelModal.tsx`
- [ ] T016 [US2] Create the Container Split modal dialog (collecting split quantities) in `src/app/[locale]/(protected)/inventory/batches/_components/SplitModal.tsx`
- [ ] T017 [P] [US2] Write unit tests for label preview compiling, reprint validation, and container split math in `src/features/batches/__tests__/label.test.ts`

**Checkpoint**: User Stories 1 & 2 are complete. Labels and QR codes can be generated, split, and printed.

---

## Phase 5: User Story 3 - Gated Traceability Portal & Search (Priority: P2)

**Goal**: Provide a fully gated, RBAC-protected traceability timeline page for batches and containers, alongside dashboard search, sorting, and expiry monitoring alerts.

**Independent Test**: Verify that the traceability page rejects unauthenticated requests, and displays batch/recipe/staff/movements data corresponding to the authenticated user's permissions.

### Implementation for User Story 3

- [ ] T018 [P] [US3] Implement `getBatchTraceabilityAction` query action and search/filter queries in `src/features/batches/queries.ts`
- [ ] T019 [US3] Build the Batches dashboard list page (with sorting, filtering by status/warehouse, and pagination) in `src/app/[locale]/(protected)/inventory/batches/page.tsx`
- [ ] T020 [US3] Build the gated batch details and traceability timeline view (enforcing role-based page section visibility) in `src/app/[locale]/(protected)/inventory/batches/[batchNumber]/page.tsx`
- [ ] T021 [US3] Implement `updateBatchStatusAction` server action in `src/features/batches/actions.ts` to transition batch states (e.g., active to consumed)
- [ ] T022 [US3] Add a dashboard near-expiry alert widget (threshold warning) in `src/app/[locale]/(protected)/inventory/batches/_components/ExpiryAlerts.tsx` and integrate into the main dashboard page
- [ ] T023 [P] [US3] Write integration tests checking authentication gates and role-based field rendering in `src/features/batches/__tests__/queries.test.ts`

**Checkpoint**: Core traceability lookup and lifecycle management is functional and gated.

---

## Phase 6: User Story 4 - Quality Control Evidence Logging (Priority: P3)

**Goal**: Support logging and linking production evidence (photos or PDFs) to batches.

**Independent Test**: Upload files to a batch, check that they are stored in the private Supabase bucket, and verify they show up in the traceability details.

### Implementation for User Story 4

- [ ] T024 [P] [US4] Implement `uploadProductionEvidenceAction` server action (integrating with Supabase storage) in `src/features/batches/actions.ts`
- [ ] T025 [US4] Build file uploader drag-and-drop component in `src/app/[locale]/(protected)/inventory/batches/_components/EvidenceUploader.tsx`
- [ ] T026 [US4] Add the evidence list and preview gallery section inside `src/app/[locale]/(protected)/inventory/batches/[batchNumber]/page.tsx`
- [ ] T027 [P] [US4] Write unit tests for file type validation and size limits (max 5MB) in `src/features/batches/__tests__/evidence.test.ts`

**Checkpoint**: Production evidence can be attached and viewed on the traceability portal.

---

## Phase 7: User Story 5 - Batch Disposal & Inventory Integration (Priority: P2)

**Goal**: Support batch and container disposals, logging detailed reasons, and executing matching inventory balance deductions and waste ledger movements.

**Independent Test**: Dispose a specific quantity of a batch, verify remaining quantity updates, and verify matching deductions in `inventory_balances` and `StockMovement`.

### Implementation for User Story 5

- [ ] T028 [US5] Implement `disposeBatchAction` server action in `src/features/batches/actions.ts` to create the `BatchDisposal` record, update batch status, and trigger a `WASTE` stock movement
- [ ] T029 [US5] Integrate disposal action with stock balance adjustment and stock movement ledger inside `src/features/inventory/actions.ts` (from Inventory module)
- [ ] T030 [US5] Build the Batch Disposal dialog modal in `src/app/[locale]/(protected)/inventory/batches/_components/DisposalModal.tsx` and hook it into the batch detail screen
- [ ] T031 [P] [US5] Write integration tests for stock ledger reductions and over-disposal validation in `src/features/batches/__tests__/disposals.test.ts`

**Checkpoint**: Disposals are fully linked with inventory records.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final QA, cleanup, validation walkthrough, and compliance check.

- [ ] T032 Verify performance goals (lookup < 500ms, label compilation < 2s) under large list rendering
- [ ] T033 Execute manual scenarios in `quickstart.md`
- [ ] T034 Run TypeScript typechecking (`npm run typecheck`) and ESLint checks (`npm run lint`)
- [ ] T035 [P] Add user-facing feature documentation in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

* **Setup (Phase 1)**: No dependencies - can start immediately.
* **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
* **User Stories (Phases 3+)**: All depend on Foundational phase completion.
  * US1 (Batch creation) must be completed first as it provides the batches that all subsequent stories print, display, or dispose.
  * US2 (Label/QR), US3 (Gated Portal), US5 (Disposal) can be worked on in parallel after US1 is complete.
  * US4 (Evidence) depends on US3 (Portal detail view structure).
* **Polish (Phase 8)**: Depends on all user stories being completed.

### Parallel Opportunities

* Setup tasks (T001, T002) can run in parallel.
* Foundational database updates (T003) and utility creation (T005) can run in parallel.
* Once US1 is complete:
  * Team Member A can work on US2 (Label templates & CSS printing).
  * Team Member B can work on US3 (Search/Filter queries and Dashboard view).
  * Team Member C can work on US5 (Disposal logic & Inventory ledger link).
* All tests marked [P] can run in parallel with implementation files.
