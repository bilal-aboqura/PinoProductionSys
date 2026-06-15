# Tasks: Settings and Master Data

**Input**: Design documents from `/specs/008-settings-master-data/`  
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

- [ ] T001 Create project structure for settings feature in `src/features/settings`
- [ ] T002 Define Zod validation schemas for system settings and master data in `src/features/settings/validation.ts`
- [ ] T003 [P] Define TypeScript interfaces and DTOs in `src/features/settings/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database tables and shared queries that must be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Update `prisma/schema.prisma` with localized fields, StorageCondition, LabelTemplate, SystemSetting models, and new AuditAction enums
- [ ] T005 Run Prisma database migration `npx prisma migrate dev` to apply schema updates
- [ ] T006 Update seed script in `prisma/seed.ts` with initial preferences, default storage conditions, label templates, and waste reasons
- [ ] T007 Implement Prisma database query utility functions in `src/features/settings/queries.ts`
- [ ] T008 [P] Configure RBAC settings permission checks and route exports in `src/lib/permissions.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Centralized Master Data Management (Priority: P1) 🎯 MVP

**Goal**: Create, view, edit, and deactivate localized Departments, Production Lines, Warehouses, and Recipe Categories.

**Independent Test**: Create master data entities in Admin UI, verify Arabic/English localization fields, and confirm archived items are omitted from active list dropdowns.

### Tests for User Story 1
- [ ] T009 [P] [US1] Create Playwright integration tests for master data CRUD operations and soft archiving in `tests/integration/master-data.spec.ts`

### Implementation for User Story 1
- [ ] T010 [US1] Implement Server Actions for master CRUD and soft deactivation (`createMasterEntity`, `updateMasterEntity`, `archiveMasterEntity`, `restoreMasterEntity`) in `src/features/settings/actions.ts`
- [ ] T011 [US1] Build the shared Master Data list and form modal component in `src/app/[locale]/(protected)/admin/settings/components/MasterDataForm.tsx`
- [ ] T012 [US1] Build the localized administration page for Departments in `src/app/[locale]/(protected)/admin/settings/departments/page.tsx`
- [ ] T013 [US1] Build the localized administration page for Production Lines in `src/app/[locale]/(protected)/admin/settings/production-lines/page.tsx`
- [ ] T014 [US1] Build the localized administration page for Warehouses/Inventory Areas in `src/app/[locale]/(protected)/admin/settings/warehouses/page.tsx`
- [ ] T015 [US1] Build the localized administration page for Recipe Categories in `src/app/[locale]/(protected)/admin/settings/categories/page.tsx`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Waste & Disposal Reasons Configuration (Priority: P1)

**Goal**: Custom Waste Reasons management to enforce structured categorization for manual adjustments.

**Independent Test**: Create custom waste reason "Damaged in Transit" in Admin UI, navigate to manual stock adjustments, and verify the new reason displays in options.

### Tests for User Story 2
- [ ] T016 [P] [US2] Create Playwright integration tests for waste reasons management in `tests/integration/waste-reasons.spec.ts`

### Implementation for User Story 2
- [ ] T017 [US2] Build the Waste Reasons administration page in `src/app/[locale]/(protected)/admin/settings/waste-reasons/page.tsx`

**Checkpoint**: User Stories 1 and 2 are fully functional and integrated.

---

## Phase 5: User Story 3 - System-Wide Operational Configuration (Priority: P1)

**Goal**: Configure localization settings, default safety stock margins, print dimension settings, and storage conditions.

**Independent Test**: Modify the low stock threshold percentage to 15% in UI, save preferences, and verify that the system correctly updates stock alert boundaries.

### Tests for User Story 3
- [ ] T018 [P] [US3] Create unit tests for settings schema validation and thresholds in `src/features/settings/__tests__/validation.test.ts`
- [ ] T019 [P] [US3] Create Playwright integration tests for dynamic system settings in `tests/integration/settings-preferences.spec.ts`

### Implementation for User Story 3
- [ ] T020 [US3] Implement Server Actions for saving preferences and configurations (`saveSystemSetting`) in `src/features/settings/actions.ts`
- [ ] T021 [US3] Build the localized administration page for Storage Conditions in `src/app/[locale]/(protected)/admin/settings/conditions/page.tsx`
- [ ] T022 [US3] Build the main settings preferences dashboard (Localization, Thresholds, Barcode/QR, Labels) in `src/app/[locale]/(protected)/admin/settings/page.tsx`

**Checkpoint**: User Stories 1, 2, and 3 are fully functional and testable.

---

## Phase 6: User Story 4 - Audit Trail of Configuration Changes (Priority: P2)

**Goal**: Log all administrative modifications (before/after states in JSON format) and retain them indefinitely.

**Independent Test**: Edit an operational preference, navigate to the audit viewer page, and verify a row exists detailing the user, timestamp, action type, and before/after diff.

### Tests for User Story 4
- [ ] T023 [P] [US4] Create unit tests for JSON diffing utilities in `src/features/settings/__tests__/audit-diff.test.ts`
- [ ] T024 [P] [US4] Create Playwright integration tests for audit logging in `tests/integration/settings-audit.spec.ts`

### Implementation for User Story 4
- [ ] T025 [US4] Implement Server Action-level JSON diffing and immutable logging helpers in `src/features/settings/actions.ts`
- [ ] T026 [US4] Build the administrative Audit Log viewer page with search, action filters, and JSON diff expanders in `src/app/[locale]/(protected)/admin/settings/audit/page.tsx`

**Checkpoint**: All user stories are independently functional and auditable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Navigation integration, layout validation, and quickstart checklist execution

- [ ] T027 Configure admin sidebar and app header navigation links in `src/components/layout/AppNav.tsx`
- [ ] T028 [P] Implement responsive layout validations (mobile/tablet check) for all admin settings screens in `tests/integration/settings-responsive.spec.ts`
- [ ] T029 Run the Quickstart validation scenarios listed in `specs/008-settings-master-data/quickstart.md`
- [ ] T030 Perform final code linting and formatting checks in `package.json`

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
- **User Story 3 (P1)**: Can start after Phase 2 - Independent of US1/US2.
- **User Story 4 (P2)**: Can start after Phase 2 - Logs changes from US1, US2, and US3, but uses a decoupled logging implementation.

### Parallel Opportunities

- Setup tasks `T001` - `T003` can run in parallel.
- Foundational helper check `T008` can run in parallel with query development.
- Playwright integration tests `T009`, `T016`, `T019`, and `T024` can be written in parallel.
- User Stories 1, 2, and 3 can be developed concurrently by separate developers once the foundational database/query layers are complete.

---

## Parallel Example: User Story 1

```bash
# Launch master data models and Server Action tests:
Task: "Create Playwright integration tests for master data CRUD operations and soft archiving in tests/integration/master-data.spec.ts"

# Develop frontend page components simultaneously:
Task: "Build the localized administration page for Departments in src/app/[locale]/(protected)/admin/settings/departments/page.tsx"
Task: "Build the localized administration page for Production Lines in src/app/[locale]/(protected)/admin/settings/production-lines/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - database migrations & seed scripts).
3. Complete Phase 3: User Story 1 (Core localized master data management).
4. Complete Phase 4: User Story 2 (Waste reasons configurations).
5. **STOP and VALIDATE**: Run manual tests for master data localization and soft-archiving.

### Incremental Delivery

1. Complete Setup + Foundational → Database is ready.
2. Add User Story 1 & 2 → Verify localized master CRUD and waste reasons → Deploy/Demo (MVP!).
3. Add User Story 3 → Integrate system thresholds and settings dashboard → Deploy/Demo.
4. Add User Story 4 → Integrate JSON-diff audit viewer → Deploy/Demo.
5. Apply polish and run quickstart verification scenarios.
