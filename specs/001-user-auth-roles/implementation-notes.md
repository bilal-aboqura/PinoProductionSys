# Implementation Notes

## Environment-dependent tasks

- `T021` is implemented with Auth.js JWT sessions instead of database sessions because Auth.js v5 Credentials provider rejects database sessions at runtime. The session callback refreshes user, role, permission, active status, and forced-password state from Prisma on each request so role changes and deactivation are enforced on the next request.
- `T013` requires a real Supabase `DATABASE_URL` and `DIRECT_URL`, so it was not run in this local workspace.
- `T015` must be run manually in the Supabase SQL Editor after the initial migration creates the tables.
- `T048` is implemented at the protected layout/page level, not in middleware, because database-backed Auth.js/Prisma checks are not suitable for Edge middleware. Direct protected pages call `requirePermission()` and render `AccessDenied`.
- `T082` quickstart validation is blocked until Supabase credentials exist and `npx prisma migrate dev --name init` succeeds.

## Validation completed locally

- `npx prisma generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`

`npm test` currently exits with "No test files found" because the generated Spec Kit task list explicitly omitted test tasks.
