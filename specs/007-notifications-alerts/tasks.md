# Tasks: Notifications and Alerts

**Input**: Design documents from `/specs/007-notifications-alerts/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initial database migration and dependency verification

- [ ] T001 Run database migrations to apply schema changes: `npx prisma db push`
- [ ] T002 Verify UI dependency packages, running npm install swr if missing in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema definitions and rules engine structure

**⚠️ CRITICAL**: No user story implementation can begin until these foundational tasks are completed.

- [ ] T003 Define Prisma models `Notification`, `NotificationRecipient`, `AlertRule`, and `NotificationPreference` in `prisma/schema.prisma`
- [ ] T004 Define seed script changes to populate default alert rules in `prisma/seed.ts`
- [ ] T005 [P] Create skeleton rules engine structure and threshold evaluator in `src/features/notifications/engine.ts`
- [ ] T006 [P] Define TypeScript types and API interfaces in `src/features/notifications/types.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - In-App Notification Center & Real-time Alerts (Priority: P1) 🎯 MVP

**Goal**: Deliver real-time notification alerts (dropdown bell popover and toast messages) based on role-based access.

**Independent Test**: Simulate a database notification insertion and verify that a logged-in user receives a toast alert and the notification header bell unread count increments within 2 seconds.

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create unit tests for notification queries and recipient mapping in `src/features/notifications/__tests__/queries.test.ts`
- [ ] T008 [US1] Implement DB query helpers for unread count and recent notifications in `src/features/notifications/queries.ts`
- [ ] T009 [US1] Create REST API route handlers `/api/notifications/unread` and `/api/notifications/recent` in `src/app/api/notifications/unread/route.ts` and `src/app/api/notifications/recent/route.ts`
- [ ] T010 [P] [US1] Build the interactive header `NotificationBell` client component using SWR polling in `src/components/layout/NotificationBell.tsx`
- [ ] T011 [US1] Integrate the `NotificationBell` component into the header bar inside `src/components/layout/AppNav.tsx`
- [ ] T012 [P] [US1] Create in-app banner/toast rendering utility for high-priority alerts in `src/components/layout/NotificationToast.tsx`

**Checkpoint**: User Story 1 is fully functional as a standalone MVP.

---

## Phase 4: User Story 2 - Role-Based Notification History (Priority: P1)

**Goal**: Provide a full list view page showing all notification history, filterable and support archiving.

**Independent Test**: Navigate to `/notifications`, verify the paginated history list loads, apply the "INVENTORY" category filter, and verify click-to-archive deletes the notification from the list.

### Implementation for User Story 2

- [ ] T013 [P] [US2] Implement Server Actions to mark read and archive notifications in `src/features/notifications/actions.ts`
- [ ] T014 [US2] Create query helper to fetch paginated notification history with status/category filters in `src/features/notifications/queries.ts`
- [ ] T015 [P] [US2] Add translation strings for notifications in `src/i18n/locales/ar.json` and `src/i18n/locales/en.json`
- [ ] T016 [US2] Build the dedicated Notification History screen at `src/app/[locale]/(protected)/notifications/page.tsx`

**Checkpoint**: Notification history and archiving functions are verified.

---

## Phase 5: User Story 3 - Actionable Click-Through Links (Priority: P1)

**Goal**: Navigate the user directly to the related record (order, item, batch) when they click a notification.

**Independent Test**: Click an inventory low stock notification and verify that the application redirects directly to the details page for that inventory item.

### Implementation for User Story 3

- [ ] T017 [P] [US3] Create path resolver utility mapping `relatedEntityType` and `relatedEntityId` to URL paths in `src/features/notifications/utils.ts`
- [ ] T018 [US3] Update item click event handlers in `NotificationBell.tsx` and `notifications/page.tsx` to call `markNotificationRead` and navigate to the resolved entity URL.

**Checkpoint**: Click-through links successfully redirect users to target pages.

---

## Phase 6: User Story 4 - Configurable Alert Rules & Thresholds (Priority: P2)

**Goal**: Allow Administrators/Supervisors to manage thresholds and toggle alert rules.

**Independent Test**: Update the low-stock rule threshold from 10 to 20, decrease item stock to 15, and verify that the low-stock notification is generated under the new threshold.

### Implementation for User Story 6

- [ ] T019 [P] [US4] Create Server Actions to edit, enable, or disable alert rules in `src/features/notifications/actions.ts`
- [ ] T020 [P] [US4] Add rule schema validation using Zod in `src/features/notifications/validation.ts`
- [ ] T021 [US4] Build the rules management page at `src/app/[locale]/(protected)/admin/alert-rules/page.tsx`
- [ ] T022 [US4] Integrate rule engine trigger checks inside state-mutating actions (e.g. inventory adjustments, production completion) in `src/features/inventory/actions.ts` and `src/features/production/actions.ts`

**Checkpoint**: Alert rules are configurable and dynamically trigger alerts.

---

## Phase 7: User Story 5 - Personal & Role-based Preferences (Priority: P2)

**Goal**: Allow users to enable or disable notification categories based on their roles.

**Independent Test**: Toggle off "Production" notifications in user profile, trigger a production delay alert, and verify that the user does not receive the alert.

### Implementation for User Story 7

- [ ] T023 [P] [US5] Implement Server Action to update personal user notification preferences in `src/features/notifications/actions.ts`
- [ ] T024 [US5] Build preferences UI panel in profile settings page at `src/app/[locale]/(protected)/profile/notifications/page.tsx`
- [ ] T025 [US5] Update the rules engine to check recipient preferences before inserting `NotificationRecipient` records in `src/features/notifications/engine.ts`

**Checkpoint**: User preferences successfully filter active notifications.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, automatic data retention cleanup, and E2E validation

- [ ] T026 Implement 90-day automatic data pruning route handler in `src/app/api/internal/notification-cleanup/route.ts` secured by Bearer Token for VPS cron trigger
- [ ] T027 [P] Perform security hardening to ensure users cannot access or read notifications of other users
- [ ] T028 Run end-to-end scenarios documented in `specs/007-notifications-alerts/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. BLOCKS all user stories.
- **User Stories (Phases 3-7)**: All depend on Foundational completion.
- **Polish (Phase 8)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Standard in-app notifications. Can start after Phase 2 is complete.
- **User Story 2 (P2)**: Integrates with read status actions but runs in parallel with US1 UI design.
- **User Story 3 (P3)**: Depends on US1/US2 UI elements being present.
- **User Story 4 (P4)**: Depends on engine structure (T005).
- **User Story 5 (P5)**: Depends on engine structure (T005).

---

## Parallel Execution Examples

### Parallel Opportunity 1: Foundational setup
```bash
# Developer A:
Task: T005 [P] Create skeleton rules engine structure and threshold evaluator in src/features/notifications/engine.ts
# Developer B:
Task: T006 [P] Define TypeScript types and API interfaces in src/features/notifications/types.ts
```

### Parallel Opportunity 2: User Story 1 UI and Test setup
```bash
# Developer A:
Task: T007 [P] [US1] Create unit tests for notification queries and recipient mapping in src/features/notifications/__tests__/queries.test.ts
# Developer B:
Task: T010 [P] [US1] Build the interactive header NotificationBell client component using SWR polling in src/components/layout/NotificationBell.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Execute database migration and client updates.
2. Complete rules engine base shell and types.
3. Build header bell component and REST API endpoint.
4. Verify dynamic unread badge count updates on mock database insertions.
5. Deploy/Demo the notification bell MVP!
