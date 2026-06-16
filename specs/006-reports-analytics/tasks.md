# Tasks: Reports and Analytics

**Input**: Design documents from `/specs/006-reports-analytics/`
**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Tests**: Test tasks are included under Phase 9 (Polish) to verify the data aggregation mathematics and permission logic.

**Organization**: Tasks are grouped by setup, foundation, user story, and polish phases to enable independent implementation and incremental testing.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder structure setup and package installation.

- [X] T001 Create folder structures for `src/features/reports` and `src/app/[locale]/(protected)/reports`
- [X] T002 Install `exceljs` and `pdfkit` packages (along with `@types/pdfkit`) in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema models, reporting views, and base TypeScript/Zod structures.

**⚠️ CRITICAL**: No user story implementation can begin until database views are compiled and generated.

- [X] T003 Create ScheduledReport and ReportArchive models in `prisma/schema.prisma`
- [X] T004 Define SQL Migration for reporting database views (`production_summary_view`, `inventory_summary_view`, `batch_summary_view`, `waste_summary_view`, `staff_performance_view`) in `prisma/migrations/`
- [X] T005 Run database migrations and generate Prisma Client in `prisma/`
- [X] T006 [P] Define TypeScript interfaces in `src/features/reports/types.ts`
- [X] T007 [P] Create Zod validation schemas in `src/features/reports/validation.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Operational Dashboard & Analytics Overview (Priority: P1) 🎯 MVP

**Goal**: Display high-level summary KPIs and trend charts on a responsive dashboard page.

**Independent Test**: Navigate to `/reports` and verify that the dashboard widgets load accurate data within 2s.

- [X] T008 [P] [US1] Create database queries for dashboard metrics in `src/features/reports/queries.ts`
- [X] T009 [US1] Implement server action getDashboardKPIs in `src/features/reports/actions.ts`
- [X] T010 [P] [US1] Create reusable KPI Card and Trend Chart components in `src/app/[locale]/(protected)/reports/_components/`
- [X] T011 [US1] Build the main Reports dashboard page in `src/app/[locale]/(protected)/reports/page.tsx`

**Checkpoint**: Operational dashboard is functional and testable independently.

---

## Phase 4: User Story 2 - Detailed Production & Inventory Reports with Drill-down (Priority: P1)

**Goal**: Detailed tables for Production, Inventory, Waste, and Warehouse reports with sorting, pagination, and drill-down links.

**Independent Test**: Click on an inventory card, verify navigation to the transaction ledger, and drill down to a specific production order.

- [X] T012 [P] [US2] Implement database queries for detailed reports in `src/features/reports/queries.ts`
- [X] T013 [US2] Implement server action getReportData in `src/features/reports/actions.ts`
- [X] T014 [P] [US2] Build ReportTable component with pagination/sorting/filters in `src/app/[locale]/(protected)/reports/_components/ReportTable.tsx`
- [X] T015 [US2] Build pages for production, inventory, waste, and warehouse reports in `src/app/[locale]/(protected)/reports/`
- [X] T016 [US2] Add drill-down navigation routes in `src/app/[locale]/(protected)/reports/_components/ReportTable.tsx`

**Checkpoint**: Detailed reports and navigation are operational.

---

## Phase 5: User Story 3 - Batch Traceability & History Report (Priority: P2)

**Goal**: Dedicated Batch Traceability view containing search and chronological history timeline.

**Independent Test**: Search for a Batch ID on the Batch Report page and view its timeline.

- [X] T017 [P] [US3] Create database query for batch history timeline in `src/features/reports/queries.ts`
- [X] T018 [US3] Add batch report types to getReportData in `src/features/reports/actions.ts`
- [X] T019 [P] [US3] Build Batch Report page in `src/app/[locale]/(protected)/reports/batches/page.tsx`
- [X] T020 [US3] Build BatchTimeline component in `src/app/[locale]/(protected)/reports/_components/BatchTimeline.tsx`

**Checkpoint**: Batch tracing and timelines are functional.

---

## Phase 6: User Story 4 - Report Exporting and Printing (Priority: P2)

**Goal**: Export reports to Excel (`.xlsx`) files and print-optimized PDF documents.

**Independent Test**: Filter a report, click Export, and verify download completes under 10 seconds.

- [X] T021 [P] [US4] Implement Excel generation utility using exceljs in `src/features/reports/exports/excel.ts`
- [X] T022 [P] [US4] Implement PDF generation utility using pdfkit in `src/features/reports/exports/pdf.ts`
- [X] T023 [US4] Create Next.js API route handlers for downloads in `src/app/api/reports/export/route.ts`
- [X] T024 [US4] Add export button triggers to ReportTable in `src/app/[locale]/(protected)/reports/_components/ReportTable.tsx`

**Checkpoint**: Excel and PDF exporting work.

---

## Phase 7: User Story 5 - Staff Activity and Performance Metrics (Priority: P3)

**Goal**: Individual user performance dashboard tracking completed orders, times, and timelines.

**Independent Test**: Query a specific operator's performance and verify metrics populate correctly.

- [X] T025 [P] [US5] Create database query for individual staff performance metrics in `src/features/reports/queries.ts`
- [X] T026 [US5] Add staff report types to getReportData in `src/features/reports/actions.ts`
- [X] T027 [US5] Build Staff Performance page in `src/app/[locale]/(protected)/reports/staff/page.tsx`

**Checkpoint**: Individual staff reporting dashboard is functional.

---

## Phase 8: User Story 6 - Scheduled Reports & Archiving (Priority: P3)

**Goal**: Enable configuration and server-side generation of periodic reports archived in Supabase Storage.

**Independent Test**: Trigger scheduled report route, check report is saved in Supabase storage and visible in the download archive.

- [X] T028 [P] [US6] Create scheduled report configuration queries in `src/features/reports/queries.ts`
- [X] T029 [US6] Implement scheduled report Server Actions in `src/features/reports/actions.ts`
- [X] T030 [US6] Create API route handler for report scheduling cron in `src/app/api/reports/cron/route.ts`
- [X] T031 [US6] Build Scheduled Reports configuration page in `src/app/[locale]/(protected)/reports/scheduled/page.tsx`

**Checkpoint**: Automated reporting schedules are functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, test coverage, and design system alignment.

- [X] T032 [P] Enforce page-level RBAC permission gates in `src/app/[locale]/(protected)/reports/`
- [X] T033 Add unit tests for report queries in `src/features/reports/queries.test.ts`
- [X] T034 [P] Add integration tests for report filters and exports in `tests/integration/reports.test.ts`
- [X] T035 Verify responsive dashboard layouts on desktop/tablet/mobile viewports
- [X] T036 Run quickstart validation scenarios defined in `specs/006-reports-analytics/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational completion. Can run in parallel or sequentially.
- **Polish (Phase 9)**: Depends on all user stories completion.

### Parallel Opportunities
- Setup tasks (T001, T002) can run in parallel.
- Zod schema definition (T007) and Types declaration (T006) can run in parallel.
- Once Foundation (Phase 2) completes, different developers can implement User Stories in parallel.
- Export utilities (T021, T022) can be developed in parallel.

---

## Parallel Example: User Story 4
```bash
# Launch model exports simultaneously:
Task: "Implement Excel generation utility using exceljs in src/features/reports/exports/excel.ts"
Task: "Implement PDF generation utility using pdfkit in src/features/reports/exports/pdf.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (Schema & DB Views).
3. Complete Phase 3: User Story 1 (KPI Dashboard).
4. **STOP and VALIDATE**: Verify dashboard KPIs load accurately.
5. Deploy/Demo MVP.

### Incremental Delivery
- Add User Story 2 (Tabular Reports) and test.
- Add User Story 3 (Batch Traceability) and test.
- Add User Story 4 (Excel/PDF Exports) and test.
- Add User Story 5 (Staff Performance) and test.
- Add User Story 6 (Scheduled Reports) and test.
