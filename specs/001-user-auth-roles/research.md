# Research: User Authentication & Role Management

**Branch**: `001-user-auth-roles` | **Date**: 2026-06-12
**Phase**: 0 — Research & Decision Log

---

## 1. Authentication Library — Auth.js v5 (NextAuth)

**Decision**: Auth.js v5 (NextAuth) with the Prisma adapter and credentials provider.

**Rationale**:
- Native Next.js 15 App Router support with built-in middleware integration
- Prisma adapter stores sessions in the database, enabling server-side session invalidation
  when a user is deactivated or their role changes — critical for this platform
- Credential provider supports custom username-or-email lookup logic
- Session callbacks allow injecting role and permissions into the JWT/session at login time,
  avoiding per-request DB lookups for permission checks on reads
- Well-maintained, large community, extensive Next.js-specific documentation

**Alternatives considered**:
- **Lucia Auth**: Lighter, more control, but requires more manual wiring for Next.js 15 App Router;
  less mature ecosystem for this use case
- **Clerk / Auth0**: Managed identity providers — overkill for a ~30-user internal tool;
  adds external dependency and cost; reduced control over custom password flows
- **Custom JWT**: Full control but significantly more security risk surface; not justified
  for this scope

---

## 2. Password Security — bcrypt cost factor 12

**Decision**: `bcryptjs` with cost factor 12 for password hashing.

**Rationale**:
- Cost factor 12 produces ~200-400ms hashing time on modern hardware — well within the
  30-second login UX target while providing strong protection against brute force
- Industry standard recommendation for 2024-2026 (OWASP recommends cost ≥ 10)
- bcryptjs is pure JavaScript (no native bindings), avoiding build complexity in Next.js
  serverless/edge environments
- Argon2 would be stronger but requires native bindings (node-pre-gyp) which complicate
  deployment; not justified for an internal 30-user system

**Temporary password strategy**:
- System generates a cryptographically random 12-character temporary password on user creation
  and on Admin-initiated reset
- Password is flagged `mustChangePassword: true` in the `users` table
- Auth.js session callback detects this flag and redirects to `/change-password` before
  granting any platform access
- Temporary password is displayed exactly once on-screen (not stored in plaintext after hashing)

---

## 3. Session Strategy — Database Sessions

**Decision**: Prisma-backed database sessions (not JWT stateless tokens).

**Rationale**:
- Database sessions allow immediate server-side invalidation: when an Admin deactivates a
  user, their active session is destroyed at the next request, not just at token expiry
- The `sessions` table managed by the Prisma adapter handles this automatically when the
  session is looked up and the user is found inactive
- For ~30 users, database session overhead is negligible; there is no scaling pressure
  requiring stateless JWTs
- Role and permission claims are embedded in the session at login for fast reads; on
  mutations that change permissions, the session is invalidated and refreshed

**Session timeout**:
- Auth.js `maxAge` set to 28800 seconds (8 hours default) matching operational shifts
- Configurable via `SESSION_MAX_AGE` environment variable

---

## 4. Permission Architecture — Role-Permission Table + Session Claims

**Decision**: Permissions stored in `role_permissions` table; active permission set embedded
in session at login.

**Rationale**:
- Storing permissions in the DB makes the permission matrix editable without code deploys
  (future Admin UI for permission management)
- Embedding the resolved permission set in the Auth.js session (via `jwt` callback) avoids
  a DB round-trip on every server action for read-only checks
- Sensitive mutations re-validate from the DB (not session cache) to prevent stale permission
  exploits after a role change

**Permission code format**: `resource:action` (e.g., `users:create`, `production:approve`)

**Server-side enforcement pattern**:
```typescript
// lib/permissions.ts
export async function requirePermission(
  session: Session,
  permission: string
): Promise<void> {
  if (!session.user.permissions.includes(permission)) {
    throw new Error('PERMISSION_DENIED')
  }
}
```

---

## 5. Scope Filtering — Database-Level WHERE Clause

**Decision**: Scope restrictions enforced at the Prisma query level, not UI filtering.

**Rationale**:
- UI-only filtering is a security anti-pattern; determined users can bypass it via direct
  API calls or by reading raw network responses
- Scope dimensions are joined as WHERE conditions on every query that fetches scoped data
- Pattern: `WHERE (user has no scope for dimension) OR (record.dimension IN user.scopes)`
- This ensures a scoped user genuinely cannot retrieve out-of-scope data even through
  API routes or server actions

**Multi-value scope example** (department):
```sql
SELECT * FROM production_orders po
WHERE NOT EXISTS (
  SELECT 1 FROM user_departments WHERE user_id = $userId
) OR po.department_id IN (
  SELECT department_id FROM user_departments WHERE user_id = $userId
)
```

---

## 6. Internationalization — next-intl with `[locale]` Route Segment

**Decision**: `next-intl` v3 with `/[locale]/` routing segment and middleware locale detection.

**Rationale**:
- Native Next.js App Router support with server component message loading
- Supports `dir` attribute injection on `<html>` element for RTL/LTR switching
- Message files (`ar.json`, `en.json`) namespaced by feature (auth, users, common)
- Language preference persisted in the `users.language_preference` column and also in
  a cookie for the login screen (before authentication)

**RTL implementation approach**:
- Tailwind CSS configured with `direction` in `tailwind.config.ts`
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`) via Tailwind's
  `ms-`, `me-`, `ps-`, `pe-` utilities instead of directional (`ml-`, `mr-`) for
  layout-neutral components
- Use `rtl:` Tailwind variant only where logical properties are insufficient
- next-intl middleware sets `<html lang="ar" dir="rtl">` or `<html lang="en" dir="ltr">`

---

## 7. Audit Logging — Explicit Logger + Prisma Middleware

**Decision**: Dedicated `logAuditEvent()` function called explicitly in Server Actions,
supplemented by Prisma middleware for bulk operation safety.

**Rationale**:
- Explicit calls in Server Actions give full control over before/after values and action
  labeling — critical for meaningful audit entries
- Prisma middleware acts as a safety net for any mutations that bypass the Server Action layer
- Audit log table has no `UPDATE` or `DELETE` permissions granted at the DB user level —
  enforced at the PostgreSQL role level, not just application layer

**Audit event structure**:
```typescript
interface AuditEvent {
  actorId: string          // who performed the action
  actorName: string        // display name at time of action
  targetId: string | null  // affected user (null for system events)
  targetName: string | null
  action: AuditAction      // enum: USER_CREATED | USER_UPDATED | ROLE_ASSIGNED | ...
  previousValue: Json | null
  newValue: Json | null
  ipAddress: string | null
  timestamp: DateTime      // UTC, auto-set by DB default
}
```

---

## 8. Testing Strategy

**Decision**: Vitest for unit/integration, Playwright for E2E critical flows.

**Rationale**:
- Vitest integrates natively with Vite/Next.js build pipeline; fast, TypeScript-native
- Playwright provides real browser testing for RTL layout, session flows, and permission gates
- Unit test focus: permission resolver, scope evaluator, audit logger, password utilities
- Integration test focus: Server Actions with a test database (Prisma test environment)
- E2E focus: login, forced password change, role-gated navigation, user CRUD

**Test database**: Separate PostgreSQL schema (`pino_test`) seeded before each test run via
`prisma migrate reset --force` in test setup.

---

## 9. Database Hosting — Supabase

**Decision**: Supabase (managed PostgreSQL 16) as the database host.

**Rationale**:
- Supabase provides managed PostgreSQL with automatic backups, connection pooling via
  pgBouncer, and a built-in SQL editor — reducing operational overhead for an internal tool
- Native compatibility with Prisma via standard PostgreSQL connection strings
- Free tier sufficient for ~30 users; scales if the platform grows
- Supabase dashboard provides a convenient visual table browser during development

**Prisma + Supabase connection configuration**:

Supabase provides two connection strings per project:

| Variable | URL | Port | Use |  
|----------|-----|------|-----|
| `DATABASE_URL` | Transaction Pooler (pgBouncer) | 6543 | Runtime queries (Server Actions, API routes) |
| `DIRECT_URL` | Direct connection | 5432 | Prisma migrations only (`prisma migrate dev`) |

The `schema.prisma` datasource block MUST include `directUrl` to allow migrations to bypass
the pooler (pgBouncer does not support the extended query protocol required by migrations):

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooler — used at runtime
  directUrl = env("DIRECT_URL")     // direct — used for migrations only
}
```

**Row Level Security (RLS)**:
- Supabase enables RLS on tables by default. Since Prisma uses the service role / pooler
  connection, RLS policies would block all queries unless disabled or explicitly configured.
- Decision: disable RLS on all application tables (security enforced at application layer
  via Auth.js + Server Action permission checks).
- Exception: `audit_logs` — grant INSERT + SELECT only to the application DB user; deny
  UPDATE and DELETE at the PostgreSQL role level via Supabase SQL editor.

**Supabase-specific setup steps** (one-time, after project creation):
```sql
-- Run in Supabase SQL Editor after migrations
-- Disable RLS on application tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Restrict audit_logs to INSERT + SELECT only
REVOKE UPDATE, DELETE ON audit_logs FROM authenticated;
REVOKE UPDATE, DELETE ON audit_logs FROM anon;
```
