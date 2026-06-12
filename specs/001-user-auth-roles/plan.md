# Implementation Plan: User Authentication & Role Management

**Branch**: `001-user-auth-roles` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-user-auth-roles/spec.md`

---

## Summary

Build the authentication and role/permission foundation for the PinoProductionSys restaurant
production management platform. Users authenticate via username or email + password using
Auth.js (NextAuth v5) with a Prisma/PostgreSQL backend. The system enforces four roles
(Administrator, Supervisor, Production Staff, Warehouse Staff) with granular multi-value scope
restrictions across four dimensions (department, recipe category, production line, inventory
area). The UI is bilingual Arabic (RTL default) + English (LTR) via next-intl. All
user-management actions feed an immutable audit log. This module is the mandatory foundation
for all future platform features.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS
**Primary Dependencies**: Next.js 15 (App Router), Auth.js v5 (NextAuth), Prisma 5.x,
  next-intl 3.x, shadcn/ui, React Hook Form 7.x, Zod 3.x, Tailwind CSS 3.x
**Storage**: PostgreSQL 16 — hosted on Supabase (via Prisma ORM). Uses Supabase Transaction
  Pooler (`DATABASE_URL`, port 6543) for runtime queries and direct connection (`DIRECT_URL`,
  port 5432) for Prisma migrations.
**Testing**: Vitest (unit), Playwright (e2e/integration)
**Target Platform**: Web — desktop, tablet, large mobile (responsive); no native app
**Project Type**: Full-stack web application (Next.js unified frontend + backend)
**Performance Goals**: Login flow ≤ 30s user time; permission checks ≤ 300ms; user list ≤ 500ms
**Constraints**: ~30 concurrent users; session inactivity timeout (configurable, default 8h);
  bilingual RTL/LTR; WCAG AA contrast minimums
**Scale/Scope**: 30+ users, thousands of audit records, 4 scope dimensions, 16 permissions minimum

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Simplicity**: Feature-based modular structure with clear boundaries. Auth.js handles
  session complexity; Prisma handles DB. No custom auth primitives.
- [x] **II. Business First**: Direct operational need — platform cannot function without auth.
  30 restaurant staff require role-gated access to production, inventory, and admin workflows.
- [x] **III. Traceability**: Full audit log for every user-management action (create, update,
  role change, scope change, activate/deactivate, login, logout, password change). Stores
  actor, target, previous value, new value, ISO timestamp.
- [x] **IV. Consistent UX**: Uses shadcn/ui components + design system tokens from constitution.
  Login page, user list, user form, audit trail all follow consistent table/form/card patterns.
- [x] **V. Responsive**: Next.js App Router + Tailwind CSS responsive layout. Desktop-first,
  tablet/large-mobile tested. RTL/LTR via next-intl `dir` attribute on `<html>`.
- [x] **VI. Performance**: User list paginated server-side. Permission lookups cached per session.
  Login page is static-rendered. No client-side permission re-fetching on every render.
- [x] **VII. Security**: Auth.js session with secure httpOnly cookies + CSRF. Server Actions
  validate permissions server-side on every mutation. Middleware enforces protected routes.
  Passwords hashed with bcrypt (cost factor 12). Temporary password forced-change flow.
  Supabase Row Level Security (RLS) disabled for audit_logs table at the application level;
  DB user granted INSERT + SELECT only (no UPDATE/DELETE) on that table via Supabase SQL editor.
- [x] **VIII. Testing**: Vitest for business logic (permission resolution, scope evaluation,
  audit logging). Playwright for critical flows (login, role change, scope assignment).
  Permission matrix tested exhaustively per role.

*No violations. Complexity Tracking table not required.*

---

## Project Structure

### Documentation (this feature)

```text
specs/001-user-auth-roles/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── server-actions.md
│   └── permission-matrix.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (protected)/
│   │   │   ├── layout.tsx          # Auth guard + nav
│   │   │   ├── dashboard/
│   │   │   └── admin/
│   │   │       └── users/
│   │   │           ├── page.tsx
│   │   │           ├── [id]/
│   │   │           │   └── page.tsx
│   │   │           └── new/
│   │   │               └── page.tsx
│   │   └── layout.tsx              # locale + dir provider
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts
│
├── features/
│   ├── auth/
│   │   ├── actions.ts              # login, logout, changePassword
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── ChangePasswordForm.tsx
│   │   ├── lib/
│   │   │   └── auth.config.ts      # NextAuth config + callbacks
│   │   └── types.ts
│   │
│   ├── users/
│   │   ├── actions.ts              # createUser, updateUser, toggleStatus
│   │   ├── components/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── ResetPasswordModal.tsx
│   │   ├── queries.ts              # Prisma read queries
│   │   └── types.ts
│   │
│   ├── roles/
│   │   ├── constants.ts            # DEFAULT_ROLE_PERMISSIONS map
│   │   └── types.ts
│   │
│   ├── permissions/
│   │   ├── lib/
│   │   │   └── resolver.ts         # resolvePermissions(userId) → PermissionSet
│   │   ├── hooks/
│   │   │   └── usePermissions.ts
│   │   └── types.ts
│   │
│   ├── scopes/
│   │   ├── actions.ts              # assignScope, removeScope
│   │   ├── components/
│   │   │   └── ScopeSelector.tsx
│   │   └── types.ts
│   │
│   └── audit/
│       ├── lib/
│       │   └── logger.ts           # logAuditEvent(event)
│       ├── components/
│       │   └── AuditLogTable.tsx
│       └── types.ts
│
├── components/
│   ├── ui/                         # shadcn/ui re-exports
│   ├── layout/
│   │   ├── AppNav.tsx
│   │   └── LanguageSwitcher.tsx
│   └── shared/
│       ├── PermissionGate.tsx      # wraps children behind permission check
│       └── AccessDenied.tsx
│
├── lib/
│   ├── auth.ts                     # Auth.js session helpers (getServerSession)
│   └── permissions.ts              # Server-side permission guard helper
│
├── server/
│   └── db.ts                       # Prisma client singleton
│
├── middleware.ts                    # Route protection + locale detection
│
├── i18n/
│   ├── routing.ts
│   └── messages/
│       ├── ar.json
│       └── en.json
│
└── prisma/
    ├── schema.prisma
    └── migrations/
```

**Structure Decision**: Single Next.js 15 App Router project. Features are co-located modules
(UI + actions + queries + types) under `src/features/`. Shared infrastructure lives in
`src/lib/` and `src/server/`. No separate backend service — Next.js Server Actions handle
all mutations server-side with session validation.

---

## Complexity Tracking

> No constitution violations. Table not required.

---

## Phase 0: Research

*See [research.md](./research.md) for full findings.*

### Key decisions resolved

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth library | Auth.js v5 (NextAuth) | Native Next.js App Router support, Prisma adapter, session callbacks for role injection |
| Password hashing | bcrypt cost 12 | Industry standard; cost 12 balances security and login latency (<300ms on modern hardware) |
| Session strategy | Database sessions (Prisma adapter) | Enables server-side invalidation on deactivation/role change without token rotation complexity |
| Permission caching | Session JWT claims + server revalidation | Role/permissions embedded in session at login; revalidated on sensitive mutations |
| i18n routing | next-intl with `[locale]` segment | Mature, App Router native, supports RTL `dir` attribute, message namespacing |
| RTL strategy | `<html lang dir>` via next-intl middleware | CSS logical properties (margin-inline, padding-inline) for layout; Tailwind `rtl:` variants for overrides |
| Scope filtering | DB-level WHERE clause with user scope join | Guarantees data-level enforcement; not UI-only filtering |
| Audit log | Prisma middleware + explicit logger function | Middleware catches Prisma mutations; explicit logger used for auth events outside Prisma |

---

## Phase 1: Design & Contracts

### Data Model

*See [data-model.md](./data-model.md) for full ERD and field definitions.*

#### Core tables

| Table | Purpose |
|-------|---------|
| `users` | Platform accounts with credentials, role, status, language pref |
| `roles` | Named permission sets (4 default roles) |
| `permissions` | Granular permission codes (e.g., `users:create`) |
| `role_permissions` | Many-to-many: roles ↔ permissions |
| `user_roles` | Many-to-many: users ↔ roles (one active role per user enforced at app layer) |
| `departments` | Scope dimension 1 |
| `user_departments` | Users ↔ departments scope assignments |
| `recipe_categories` | Scope dimension 2 |
| `user_recipe_categories` | Users ↔ recipe categories scope assignments |
| `production_lines` | Scope dimension 3 |
| `user_production_lines` | Users ↔ production lines scope assignments |
| `inventory_areas` | Scope dimension 4 |
| `user_inventory_areas` | Users ↔ inventory areas scope assignments |
| `audit_logs` | Immutable event log (no UPDATE/DELETE allowed) |

### Server Action Contracts

*See [contracts/server-actions.md](./contracts/server-actions.md) for full signatures.*

#### Auth actions
- `login(credentials)` → session or error
- `logout()` → void
- `changePassword(current, new)` → success or validation error

#### User management actions
- `createUser(data)` → user + temporary password
- `updateUser(id, data)` → updated user
- `toggleUserStatus(id)` → active/inactive (blocks last-admin deactivation)
- `resetUserPassword(id)` → new temporary password (shown once)
- `assignUserRole(userId, roleId)` → updated user
- `assignUserScopes(userId, scopes)` → updated scope set

#### Audit
- `getAuditLogs(filters)` → paginated audit events

### Permission Matrix

*See [contracts/permission-matrix.md](./contracts/permission-matrix.md) for full matrix.*

| Permission Code | Administrator | Supervisor | Production Staff | Warehouse Staff |
|-----------------|:---:|:---:|:---:|:---:|
| `users:view` | ✅ | ❌ | ❌ | ❌ |
| `users:create` | ✅ | ❌ | ❌ | ❌ |
| `users:edit` | ✅ | ❌ | ❌ | ❌ |
| `users:delete` | ✅ | ❌ | ❌ | ❌ |
| `users:toggle_status` | ✅ | ❌ | ❌ | ❌ |
| `roles:manage` | ✅ | ❌ | ❌ | ❌ |
| `audit:view` | ✅ | ❌ | ❌ | ❌ |
| `production:view` | ✅ | ✅ | ✅ | ❌ |
| `production:execute` | ✅ | ❌ | ✅ | ❌ |
| `production:approve` | ✅ | ✅ | ❌ | ❌ |
| `production:reject` | ✅ | ✅ | ❌ | ❌ |
| `inventory:view` | ✅ | ✅ | ❌ | ✅ |
| `inventory:manage` | ✅ | ❌ | ❌ | ✅ |
| `inventory:approve` | ✅ | ✅ | ❌ | ❌ |
| `reports:view` | ✅ | ✅ | ❌ | ❌ |
| `system:configure` | ✅ | ❌ | ❌ | ❌ |

### Quickstart

*See [quickstart.md](./quickstart.md) for full developer setup.*

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables (copy .env.example → .env.local)
# Required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Apply migrations
npx prisma migrate dev

# 4. Seed default roles, permissions, and admin account
npx prisma db seed

# 5. Start dev server
npm run dev
```

---

## Verification Plan

### Automated Tests

```bash
# Unit tests (permission resolver, audit logger, scope evaluation)
npx vitest run

# E2E tests (login flow, role-gated nav, admin user creation)
npx playwright test
```

### Manual Verification

1. Log in as each of the 4 roles and confirm correct navigation visibility
2. Attempt direct URL access to `/admin/users` as Warehouse Staff → expect 403
3. Create a user as Admin, verify temporary password shown once, log in as new user,
   confirm forced password change
4. Assign a user to Department A only; confirm Department B data is hidden
5. Deactivate a user; confirm login is blocked; confirm audit log entry
6. Attempt to deactivate the last Administrator → confirm the system blocks it
7. Switch language mid-session (AR ↔ EN); confirm RTL/LTR layout switches without reload
8. Search + paginate the user list with 30+ seeded users; confirm response < 500ms
