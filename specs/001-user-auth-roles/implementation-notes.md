# Implementation Notes

## Environment-dependent tasks

- `T021` is implemented with Auth.js JWT sessions instead of database sessions because Auth.js v5 Credentials provider rejects database sessions at runtime. User, role, permission, active-status, and forced-password claims are resolved at login and embedded in the signed JWT, avoiding repeated role queries during navigation. Role or account changes therefore require a new login/session before cached claims change; sensitive mutations continue to enforce authorization server-side.
- `T013` was applied with `npx prisma db push` because `npx prisma migrate dev --name init` refuses to run in this non-interactive agent session. Prisma reported the Supabase schema is in sync and the client was generated.
- The public Supabase URL/key are not enough for Prisma. Login/user administration use Prisma and require the private Postgres connection strings in `.env.local`.
- `T015` now enables RLS automatically for every public application table and removes all direct `anon`/`authenticated` table privileges. `npm run db:deploy` reapplies this security step after every migration; server-side Prisma continues through the private PostgreSQL owner connection.
- `T048` is implemented at the protected layout/page level, not in middleware, because database-backed Auth.js/Prisma checks are not suitable for Edge middleware. Direct protected pages call `requirePermission()` and render `AccessDenied`.
- `T082` quickstart validation is blocked until Supabase credentials exist and `npx prisma migrate dev --name init` succeeds.

## Validation completed locally

- `npx prisma generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

`npm test` currently exits with "No test files found" because the generated Spec Kit task list explicitly omitted test tasks.
