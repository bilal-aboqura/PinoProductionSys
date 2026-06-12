---
description: "Task list for feature 001-user-auth-roles implementation"
---

# Tasks: User Authentication & Role Management

**Input**: Design documents from `/specs/001-user-auth-roles/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: Not explicitly requested — test tasks omitted. Add `/speckit-tasks --tdd` to regenerate with tests.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths relative to repository root (`src/` prefix assumed throughout)

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Scaffold the Next.js 15 project with all required dependencies, configuration,
and folder structure before any feature code is written.

- [X] T001 Initialize Next.js 15 project with TypeScript, App Router, and Tailwind CSS in repository root (`npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"`)
- [X] T002 Install core dependencies: Auth.js v5, Prisma client, next-intl, shadcn/ui CLI, React Hook Form, Zod, bcryptjs (`npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client next-intl @hookform/resolvers zod bcryptjs`)
- [X] T003 Install dev dependencies: Prisma CLI, bcryptjs types, Vitest, Playwright, ts-node (`npm install -D prisma @types/bcryptjs vitest @vitejs/plugin-react playwright @playwright/test`)
- [X] T004 Initialize shadcn/ui with project brand colors from constitution (`npx shadcn@latest init`) — configure `components.json` with primary `#A14323`, background `#F7F3EE`, surface `#FFFFFF`
- [X] T005 [P] Create full feature-based folder structure per plan.md: `src/features/auth/`, `src/features/users/`, `src/features/roles/`, `src/features/permissions/`, `src/features/scopes/`, `src/features/audit/`, `src/components/ui/`, `src/components/layout/`, `src/components/shared/`, `src/lib/`, `src/server/`, `src/i18n/messages/`
- [X] T006 [P] Create `src/server/db.ts` — Prisma client singleton (handles connection reuse across hot reloads in dev)
- [X] T007 [P] Create `.env.example` with all required variables: `DATABASE_URL` (Supabase pooler, port 6543), `DIRECT_URL` (Supabase direct, port 5432), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SESSION_MAX_AGE`, `NEXT_PUBLIC_APP_NAME`
- [X] T008 [P] Configure `tsconfig.json` path aliases (`@/features/*`, `@/components/*`, `@/lib/*`, `@/server/*`)
- [X] T009 [P] Configure `tailwind.config.ts` with brand design tokens from constitution: colors (`primary: #A14323`, `secondary: #665936`, `background: #F7F3EE`, `surface: #FFFFFF`, `accent: #E1CEBE`, `success: #4F7A52`, `warning: #D6A04C`, `error: #C65A5A`), fonts (Cairo, Inter), and RTL support
- [X] T010 [P] Add Google Fonts to `src/app/layout.tsx`: Cairo (Arabic) and Inter (English) via `next/font/google`
- [X] T011 [P] Create `src/app/globals.css` with CSS custom properties for design tokens and base RTL/LTR logical property utilities

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, internationalization routing, Auth.js session infrastructure,
and permission resolver. ALL user stories depend on this phase completing first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database Foundation

- [X] T012 Create `prisma/schema.prisma` with Supabase datasource (`url = DATABASE_URL`, `directUrl = DIRECT_URL`), all 14 tables and 1 enum from data-model.md: `users`, `accounts`, `sessions`, `verification_tokens`, `roles`, `permissions`, `role_permissions`, `user_roles`, `departments`, `user_departments`, `recipe_categories`, `user_recipe_categories`, `production_lines`, `user_production_lines`, `inventory_areas`, `user_inventory_areas`, `audit_logs`, and `AuditAction` enum
- [ ] T013 Run `npx prisma migrate dev --name init` to apply schema to Supabase and generate Prisma client (requires `DIRECT_URL` configured)
- [X] T014 Create `prisma/seed.ts` — seeds 16 permission codes, 4 roles with role_permission assignments per permission-matrix.md, sample scope data (3 departments, 3 recipe categories, 2 production lines, 2 inventory areas), and initial admin account with `mustChangePassword: true`; prints temporary password to console
- [ ] T015 Run Supabase SQL Editor commands from quickstart.md: disable RLS on all 16 application tables; revoke UPDATE and DELETE on `audit_logs` from `authenticated` and `anon` roles

### Internationalization Foundation

- [X] T016 [P] Create `src/i18n/routing.ts` — next-intl routing config with `locales: ['ar', 'en']`, `defaultLocale: 'ar'`
- [X] T017 [P] Create `src/i18n/messages/ar.json` — Arabic translations skeleton with namespaces: `auth`, `users`, `roles`, `permissions`, `scopes`, `audit`, `common`, `navigation`, `errors`, `validation`
- [X] T018 [P] Create `src/i18n/messages/en.json` — English translations skeleton with same namespaces as ar.json
- [X] T019 Create `src/app/[locale]/layout.tsx` — root layout that sets `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`, loads Cairo/Inter font based on locale, and wraps children in next-intl `NextIntlClientProvider`
- [X] T020 Update `src/middleware.ts` — compose next-intl locale detection middleware with Auth.js authentication middleware; handle locale prefix for all routes

### Auth.js Foundation

- [ ] T021 [P] Create `src/features/auth/lib/auth.config.ts` — Auth.js v5 config with Prisma adapter, credentials provider (username-or-email lookup with bcrypt verification), session strategy `database`, `maxAge` from `SESSION_MAX_AGE` env var, and session/jwt callbacks that embed `role`, `permissions`, and `mustChangePassword` into the session object
- [X] T022 Create `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler exporting GET and POST from the auth config
- [X] T023 Create `src/lib/auth.ts` — server-side `getServerSession()` helper that retrieves the current session; throws `UNAUTHORIZED` if no session exists
- [X] T024 Create `src/app/[locale]/(protected)/layout.tsx` — protected route group layout that calls `getServerSession()` and redirects unauthenticated requests to `/[locale]/login`

### Permission Infrastructure

- [X] T025 [P] Create `src/features/permissions/types.ts` — TypeScript types: `PermissionCode` union type of all 16 codes from permission-matrix.md, `PermissionSet`, `RoleWithPermissions`
- [X] T026 [P] Create `src/features/roles/constants.ts` — `DEFAULT_ROLE_PERMISSIONS` map keyed by role slug with array of `PermissionCode` values per permission-matrix.md
- [X] T027 Create `src/features/permissions/lib/resolver.ts` — `resolvePermissions(userId)`: queries `user_roles` joined with `role_permissions` and `permissions` for the given user; returns `PermissionCode[]`; called at login and cached in session
- [X] T028 Create `src/lib/permissions.ts` — `requirePermission(session, permission: PermissionCode)` server-side guard that throws `PERMISSION_DENIED` if the session's permission set does not include the required code; used inside every Server Action
- [X] T029 Create `src/components/shared/PermissionGate.tsx` — React server component that renders children only if the current session includes the required permission; renders `null` or fallback otherwise (used for nav items and action buttons)

### Audit Infrastructure

- [X] T030 [P] Create `src/features/audit/types.ts` — TypeScript types: `AuditEvent`, `AuditAction` enum, `AuditLogEntry` (matching contracts/server-actions.md)
- [X] T031 Create `src/features/audit/lib/logger.ts` — `logAuditEvent(event: AuditEvent)`: writes to `audit_logs` table via Prisma; never throws (errors are caught and logged to console only — audit failure must never block the main operation); excludes password fields from `previousValue`/`newValue`

**Checkpoint**: Foundation complete — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Secure Login (Priority: P1) 🎯 MVP

**Goal**: Any staff member can log in using username or email + password, receive a role-appropriate
redirect, and be safely logged out on inactivity or explicit logout.

**Independent Test**: Log in with valid credentials (username), verify redirect to dashboard.
Log in with email, verify same result. Attempt invalid credentials, verify generic error.
Attempt login with deactivated account, verify rejection. Wait for session timeout, verify redirect to login.

### Implementation for User Story 1

- [X] T032 [P] [US1] Create `src/features/auth/types.ts` — types: `LoginInput`, `LoginResult`, `ChangePasswordInput`, `ChangePasswordResult` (matching server-actions.md contracts)
- [X] T033 [P] [US1] Add Arabic translations to `src/i18n/messages/ar.json` → `auth` namespace: login page title, username/email label, password label, login button, error messages (invalid credentials, account inactive), change password page strings
- [X] T034 [P] [US1] Add English translations to `src/i18n/messages/en.json` → `auth` namespace (same keys as Arabic)
- [X] T035 [US1] Create `src/features/auth/actions.ts` — `login(credentials: LoginInput)`: looks up user by username OR email (case-insensitive), verifies bcrypt hash, checks `isActive`, creates Auth.js session with role + permissions + `mustChangePassword` embedded, calls `logAuditEvent(LOGIN_SUCCESS)`, returns redirect path (`/change-password` if `mustChangePassword`, else `/dashboard`)
- [X] T036 [US1] Create `src/features/auth/actions.ts` — add `logout()`: destroys Auth.js session, calls `logAuditEvent(LOGOUT)`, redirects to `/{locale}/login`
- [X] T037 [US1] Create `src/features/auth/components/LoginForm.tsx` — React client component with React Hook Form + Zod validation; single identifier field (username or email), password field, submit button; displays localized error messages; calls `login()` server action; handles redirect response
- [X] T038 [US1] Create `src/app/[locale]/(auth)/login/page.tsx` — server component; redirects authenticated users to dashboard; renders `LoginForm` inside a centered card with brand colors, Cairo/Inter font based on locale, and Pino logo/name
- [X] T039 [US1] Create `src/features/auth/components/ChangePasswordForm.tsx` — React client component; current password field, new password field, confirm password field with Zod schema (min 8 chars, 1 uppercase, 1 number); calls `changePassword()` server action; shows validation errors inline
- [X] T040 [US1] Add `changePassword(input: ChangePasswordInput)` to `src/features/auth/actions.ts`: requires authenticated session with `mustChangePassword: true` OR any authenticated user; verifies current password; hashes new password; clears `mustChangePassword`; calls `logAuditEvent(PASSWORD_CHANGED)`; redirects to dashboard
- [X] T041 [US1] Create `src/app/[locale]/(protected)/change-password/page.tsx` — server component; checks session `mustChangePassword`; renders `ChangePasswordForm`; blocks all other navigation until password is changed (intercepted in protected layout)
- [X] T042 [US1] Update `src/app/[locale]/(protected)/layout.tsx` — add `mustChangePassword` check: if session has this flag, redirect to `/change-password` for all routes except `/change-password` itself
- [X] T043 [US1] Create `src/components/layout/AppNav.tsx` — server component; renders top navigation bar with: Pino logo, app name, language switcher, user display name, logout button; visible only within protected layout
- [X] T044 [US1] Create `src/components/layout/LanguageSwitcher.tsx` — client component; globe icon button toggling between `ar` and `en`; navigates to same page under the opposite locale; saves preference to `users.languagePreference` via server action

**Checkpoint**: User Story 1 complete — any staff member can log in, be redirected correctly, change forced password, and log out.

---

## Phase 4: User Story 2 — Role-Based Access Control (Priority: P1)

**Goal**: Logged-in users see only their permitted navigation items and sections; direct URL access
to unauthorized routes is blocked with a 403 response.

**Independent Test**: Log in as each of the 4 roles. Confirm navigation shows only permitted items.
Type a restricted URL directly (e.g., Warehouse Staff visiting `/admin/users`) — confirm 403 page, not crash.

### Implementation for User Story 2

- [X] T045 [P] [US2] Create `src/components/shared/AccessDenied.tsx` — server component; renders a localized "Access Denied" page (403) with role-appropriate message and a back-to-dashboard link; used for unauthorized route access
- [X] T046 [P] [US2] Add Arabic + English translations for navigation items and access denied messages to `ar.json` and `en.json` → `navigation` and `errors` namespaces
- [X] T047 [US2] Update `src/components/layout/AppNav.tsx` — wrap each navigation section in `<PermissionGate permission="...">` per the navigation visibility rules table in permission-matrix.md: Production (`production:view`), Inventory (`inventory:view`), Reports (`reports:view`), Admin→Users (`users:view`), Admin→Roles (`roles:manage`), Admin→Audit (`audit:view`), Admin→System (`system:configure`)
- [ ] T048 [US2] Create `src/middleware.ts` route protection logic — for each protected route pattern from permission-matrix.md, check session permissions server-side; return `AccessDenied` component (not redirect to login) for authenticated-but-unauthorized requests; redirect to login only for unauthenticated requests
- [X] T049 [US2] Create `src/app/[locale]/(protected)/dashboard/page.tsx` — default landing page after login; shows role-appropriate welcome message and a summary of accessible sections using `<PermissionGate>` wrappers; no data yet (static content)
- [X] T050 [US2] Create placeholder protected route stubs (each a minimal page returning role-check + "Coming Soon"): `src/app/[locale]/(protected)/production/page.tsx`, `src/app/[locale]/(protected)/inventory/page.tsx`, `src/app/[locale]/(protected)/reports/page.tsx` — each wrapped with appropriate `requirePermission` call that renders `<AccessDenied>` if check fails

**Checkpoint**: User Story 2 complete — all 4 roles have correct nav visibility; unauthorized direct URL access returns 403; no crashes.

---

## Phase 5: User Story 3 — User Administration (Priority: P2)

**Goal**: Administrators can create, view, edit, activate/deactivate users, assign roles, and
reset passwords. All changes recorded in the audit trail. Full user CRUD in under 2 minutes.

**Independent Test**: Log in as Administrator. Create a new user with a role. Copy temporary password.
Open incognito window, log in as new user, complete forced password change. Verify audit trail shows
creation and login events. Deactivate the user; verify they can no longer log in.

### Implementation for User Story 3

- [X] T051 [P] [US3] Create `src/features/users/types.ts` — types: `UserSummary`, `CreateUserInput`, `UpdateUserInput`, `CreateUserResult`, `UpdateUserResult`, `ToggleStatusResult`, `ResetPasswordResult` (matching server-actions.md contracts)
- [X] T052 [P] [US3] Add Arabic + English translations to `ar.json` and `en.json` → `users` namespace: page title, table column headers (Name, Username, Email, Role, Status, Last Login, Actions), form field labels, button labels (Add User, Save, Deactivate, Activate, Reset Password), confirmation messages, error messages
- [X] T053 [P] [US3] Create `src/features/users/queries.ts` — Prisma read queries: `getUserList(filters)` with search, filter by role/status, pagination (server-side), sort by name/createdAt/lastLoginAt; `getUserById(id)` with full relations (role, all scopes)
- [X] T054 [US3] Create `src/features/users/actions.ts` — `createUser(input: CreateUserInput)`: validates input with Zod; checks username uniqueness (case-insensitive); checks email uniqueness if provided; generates 12-char cryptographically random temporary password; hashes with bcrypt cost 12; creates `User` + `UserRole` + scope assignment records in a Prisma transaction; calls `logAuditEvent(USER_CREATED)`; returns `UserSummary` + `temporaryPassword`; requires `users:create` permission
- [X] T055 [US3] Add `updateUser(id, input)` to `src/features/users/actions.ts`: validates input; checks email uniqueness if changed; updates `displayName` and/or `email`; calls `logAuditEvent(USER_UPDATED)` with before/after snapshot; requires `users:edit` permission
- [X] T056 [US3] Add `toggleUserStatus(id)` to `src/features/users/actions.ts`: checks if deactivating — if so, verifies at least one other active Administrator exists (returns `LAST_ADMIN_PROTECTION` error if not); updates `isActive`; invalidates all active sessions for the user via Prisma session delete; calls `logAuditEvent(USER_ACTIVATED or USER_DEACTIVATED)`; requires `users:toggle_status` permission
- [X] T057 [US3] Add `resetUserPassword(id)` to `src/features/users/actions.ts`: generates new 12-char temporary password; hashes with bcrypt cost 12; sets `mustChangePassword: true`; invalidates all active sessions for the user; calls `logAuditEvent(PASSWORD_RESET)` — does NOT include password value in audit record; returns `temporaryPassword` (shown once); requires `users:edit` permission
- [X] T058 [US3] Add `assignUserRole(userId, roleId)` to `src/features/users/actions.ts`: validates role exists; checks last-admin protection before removing Administrator role; deletes existing `UserRole` and creates new one in a transaction; invalidates user sessions; calls `logAuditEvent(ROLE_REMOVED)` + `logAuditEvent(ROLE_ASSIGNED)`; requires `roles:manage` permission
- [X] T059 [P] [US3] Create `src/features/users/components/UserTable.tsx` — server component; renders paginated, searchable, sortable table of users with columns: Display Name, Username, Email, Role badge, Status badge (Active/Inactive), Last Login, Actions (Edit, Activate/Deactivate, Reset Password); uses shadcn/ui Table; wrapped in `<PermissionGate permission="users:view">`
- [X] T060 [P] [US3] Create `src/features/users/components/UserForm.tsx` — client component with React Hook Form + Zod; fields: Display Name, Username, Email (optional), Role selector (dropdown of 4 roles); used for both create and edit; on create-success shows temporary password in a one-time modal with copy button; submits to `createUser` or `updateUser` server actions
- [X] T061 [P] [US3] Create `src/features/users/components/ResetPasswordModal.tsx` — client component; confirmation dialog; on confirm calls `resetUserPassword(id)`; displays returned temporary password one-time in a styled alert with copy-to-clipboard button; warns user it will not be shown again
- [X] T062 [US3] Create `src/app/[locale]/(protected)/admin/users/page.tsx` — server component; calls `requirePermission(session, 'users:view')`; fetches user list via `getUserList()`; renders `UserTable` with search/filter/sort controls and "Add User" button; handles pagination via URL search params
- [X] T063 [US3] Create `src/app/[locale]/(protected)/admin/users/new/page.tsx` — server component; calls `requirePermission(session, 'users:create')`; renders `UserForm` in create mode; on success redirects to user list
- [X] T064 [US3] Create `src/app/[locale]/(protected)/admin/users/[id]/page.tsx` — server component; calls `requirePermission(session, 'users:view')`; fetches user by ID; renders `UserForm` in edit mode plus Reset Password and Activate/Deactivate action buttons; shows current role and scope assignments

**Checkpoint**: User Story 3 complete — full user CRUD, role assignment, password reset, and status toggle all functional with audit trail recording every action.

---

## Phase 6: User Story 4 — Granular Permission Scoping (Priority: P3)

**Goal**: Administrators can restrict individual users to one or more values within each scope
dimension (department, recipe category, production line, inventory area). Scope restrictions are
enforced at the database query level, not just UI.

**Independent Test**: Assign a Production Staff user to Department A and B only. Log in as that user.
Confirm Department C production records are not visible. Remove Department B scope; confirm access narrows correctly.

### Implementation for User Story 4

- [X] T065 [P] [US4] Create `src/features/scopes/types.ts` — types: `ScopeDimension` union (`'departments' | 'recipeCategories' | 'productionLines' | 'inventoryAreas'`), `ScopeAssignment`, `AssignScopesResult`, `UserScopes`
- [X] T066 [P] [US4] Add Arabic + English translations → `scopes` namespace: scope section title, dimension labels (Departments, Recipe Categories, Production Lines, Inventory Areas), assign/remove button labels, empty state messages
- [X] T067 [US4] Create `src/features/scopes/actions.ts` — `assignUserScopes(userId, scopes: ScopeAssignment)`: for each dimension provided, replaces all existing assignments with the new set in a Prisma transaction; emits `logAuditEvent(SCOPE_ASSIGNED)` and `logAuditEvent(SCOPE_REMOVED)` per dimension that changed; requires `users:edit` permission; dimensions absent from payload are left unchanged
- [X] T068 [US4] Create `src/lib/scope-filter.ts` — `buildScopeWhereClause(userId, dimension)`: returns a Prisma-compatible WHERE condition that allows access if (a) user has no scope assignment for that dimension OR (b) the record's dimension ID is in the user's assigned scope values; to be imported by future feature modules (production, inventory, recipes)
- [X] T069 [US4] Create `src/features/scopes/components/ScopeSelector.tsx` — client component; renders four multi-select sections (one per dimension); fetches available values for each dimension; shows currently assigned values as checked; handles add/remove interactions; calls `assignUserScopes` on save; shows save confirmation or error
- [X] T070 [US4] Update `src/app/[locale]/(protected)/admin/users/[id]/page.tsx` — add `ScopeSelector` component below the user form; fetch current user scope assignments and pass as initial values; render only when caller has `users:edit` permission

**Checkpoint**: User Story 4 complete — scope assignments persisted, displayed, and `buildScopeWhereClause` ready for consumption by production and inventory modules.

---

## Phase 7: User Story 5 — Audit Trail Review (Priority: P3)

**Goal**: Administrators can view, filter by date range, and search by username the complete
chronological log of all user-management events.

**Independent Test**: Perform 5 user management actions. Navigate to audit trail. Confirm all 5 appear
with correct actor, target, action label, and timestamp. Filter by today's date — confirm all 5 shown.
Search by the target username — confirm only their events shown.

### Implementation for User Story 5

- [X] T071 [P] [US5] Create `src/features/audit/types.ts` (update if exists) — ensure `AuditLogEntry`, `AuditLogFilters`, `AuditLogResult`, and localized `AuditAction` display label map are defined
- [X] T072 [P] [US5] Add Arabic + English translations → `audit` namespace: page title, column headers (Actor, Target, Action, Date/Time), filter labels (From Date, To Date, Username search), action display names for all 13 `AuditAction` enum values, empty state message
- [X] T073 [US5] Add `getAuditLogs(filters: AuditLogFilters)` to `src/features/audit/actions.ts` (create file if not exists): requires `audit:view` permission; queries `audit_logs` with optional `targetName` ILIKE search, optional `action` filter, optional date range on `createdAt`, ordered by `createdAt DESC`; returns paginated result with `total` count
- [X] T074 [US5] Create `src/features/audit/components/AuditLogTable.tsx` — server component; renders paginated table of audit events; columns: Actor (display name), Target (display name or "—"), Action (localized label with color-coded badge per action type), Timestamp (localized date + time); uses shadcn/ui Table
- [X] T075 [US5] Create `src/app/[locale]/(protected)/admin/audit/page.tsx` — server component; calls `requirePermission(session, 'audit:view')`; renders filter controls (date range pickers, username search input) above `AuditLogTable`; filter state managed via URL search params for shareability; handles pagination

**Checkpoint**: User Story 5 complete — Administrators can browse, filter, and search the full audit trail.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Finalize shared infrastructure, handle edge cases, validate quickstart, and ensure
the module is production-ready.

- [X] T076 [P] Add missing Arabic translations for all remaining keys across all namespaces in `ar.json` — validate no key is missing relative to `en.json`
- [X] T077 [P] Add missing English translations for all remaining keys across all namespaces in `en.json`
- [X] T078 Add global error boundary `src/app/[locale]/error.tsx` — catches unexpected errors in protected routes; renders localized error page with "Return to Dashboard" link
- [X] T079 Add `src/app/[locale]/not-found.tsx` — localized 404 page with navigation back to dashboard
- [X] T080 Add form-level RTL validation — review all form components (`LoginForm`, `UserForm`, `ScopeSelector`, `ChangePasswordForm`) to ensure input alignment, label placement, and error message direction are correct in Arabic RTL layout
- [X] T081 Validate `buildScopeWhereClause` returns correct Prisma WHERE shapes for all four dimensions; add inline JSDoc with usage examples for future module developers
- [ ] T082 [P] Run quickstart.md end-to-end validation: fresh clone → `npm install` → migrate → seed → `npm run dev` → first login → change password → create user → assign scope → check audit trail; document any gaps found
- [X] T083 [P] Add `npm run typecheck` script (`tsc --noEmit`) to `package.json` and confirm zero TypeScript errors across the full codebase
- [X] T084 [P] Add `npm run lint` script and confirm zero ESLint errors; configure `next.config.ts` to fail CI on lint errors
- [X] T085 Update `README.md` at repository root with: project overview, tech stack, setup steps (link to quickstart.md), role descriptions, and screenshot placeholder

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 — Login)**: Depends on Phase 2
- **Phase 4 (US2 — RBAC)**: Depends on Phase 3 (requires AppNav and session from US1)
- **Phase 5 (US3 — User Admin)**: Depends on Phase 2; can start after Phase 2 (independent of US1/US2 technically, but login must work to test it)
- **Phase 6 (US4 — Scoping)**: Depends on Phase 5 (UserForm integration) + Phase 2 (`logAuditEvent`)
- **Phase 7 (US5 — Audit Trail)**: Depends on Phase 2 (`logAuditEvent` running from US1–US4 actions)
- **Phase 8 (Polish)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — no story dependencies
- **US2 (P1)**: Requires US1 (AppNav, session, login flow)
- **US3 (P2)**: Requires Foundation only; login needed for manual testing
- **US4 (P3)**: Requires US3 (user edit page integration)
- **US5 (P3)**: Requires Foundation (audit logger writing events from US1–US4 actions)

### Within Each User Story

- Types + translations tasks [P] can run simultaneously
- Server actions before UI components
- Queries before actions that call them
- Pages after their component dependencies

### Parallel Opportunities

- All Phase 1 tasks T005–T011 can run in parallel after T001–T004
- T016–T018 (i18n) run in parallel during Phase 2
- T025–T026 (types, constants) run in parallel during Phase 2
- T030–T031 (audit types, logger) run in parallel during Phase 2
- Within each story: types + translation tasks always parallelizable [P]
- US3, US4, US5 can be worked in parallel by separate developers after Foundation is complete

---

## Implementation Strategy

### MVP First (US1 + US2 Only — Login + RBAC)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation ← **critical gate**
3. Complete Phase 3: US1 (Login)
4. Complete Phase 4: US2 (RBAC)
5. **STOP and VALIDATE**: All 4 roles can log in and see correct navigation; unauthorized routes blocked
6. Demo to stakeholders — the platform skeleton is functional

### Incremental Delivery

1. Foundation → Login → RBAC → Demo (skeleton works)
2. Add User Administration (US3) → Onboard real users → Demo
3. Add Scope Restrictions (US4) → Verify data-level isolation → Demo
4. Add Audit Trail (US5) → Compliance review → Demo
5. Polish phase → Production-ready release

### Parallel Team Strategy (if multiple developers)

1. Developer A: Phase 1 + Phase 2 (Foundation) — everyone waits for this
2. Once Foundation done:
   - Developer A: US1 (Login) + US2 (RBAC)
   - Developer B: US3 (User Administration)
3. US4 (Scoping) after US3 UI is available
4. US5 (Audit Trail) any time after Foundation (audit events start accumulating)

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies — safe to parallelize
- `[US#]` label maps each task to its user story for traceability
- Every Server Action must call `requirePermission()` as its first statement
- Temporary passwords must never be stored in plaintext after hashing — return to caller immediately and discard
- All `previousValue`/`newValue` in audit events must exclude password hash fields
- Session invalidation on deactivate/role-change: delete all `sessions` records for that `userId` via Prisma
- Commit after each phase checkpoint, not after individual tasks
- RTL/LTR: use Tailwind `ms-`/`me-`/`ps-`/`pe-` logical utilities throughout; avoid `ml-`/`mr-`/`pl-`/`pr-` in layout components
