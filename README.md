# Pino Production System

Restaurant production management platform foundation built with Next.js, Auth.js, Prisma,
PostgreSQL/Supabase, Tailwind CSS, and next-intl.

## Current Features

This implementation includes the user authentication and role-management foundation:

- Username-or-email login with database sessions
- Four seeded roles and permission-gated navigation
- Permission-gated navigation and protected routes
- Administrator user management with temporary password flow
- Scope assignments across departments, recipe categories, production lines, and inventory areas
- Immutable audit log for user-management events
- Arabic default UI with English toggle

It also includes operational production, inventory, and finished-product batch traceability workflows:

- Production order execution with completion audit history
- Inventory catalog, warehouse balances, movements, transfers, adjustments, and waste logging
- Automatic finished-product batch creation when a production order is completed
- Sequential batch IDs in `B-YYYY-NNNNN` format with recipe shelf-life expiry calculation
- Gated batch dashboard and traceability detail pages under `/inventory/batches`
- QR-backed label previews for Small, Standard, and Large label templates
- Container splits, audited reprints, evidence upload validation, and batch disposal ledger entries

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase and Auth.js values.
2. Install dependencies with `npm install`.
3. Apply the database schema with `npx prisma migrate dev --name init`.
4. Seed defaults with `npx prisma db seed`.
5. Start the app with `npm run dev`.

See [specs/001-user-auth-roles/quickstart.md](specs/001-user-auth-roles/quickstart.md) for the full setup and validation workflow.
See [specs/005-batch-mgmt-traceability/quickstart.md](specs/005-batch-mgmt-traceability/quickstart.md) for batch traceability validation scenarios.

## Scripts

- `npm run dev` starts the local Next.js server.
- `npm run typecheck` runs TypeScript validation.
- `npm run lint` runs Next.js linting.
- `npm test` runs Vitest.

## Roles

- Administrator: full access, user administration, audit, and system configuration.
- Supervisor: production and inventory view/approval plus reports.
- Production Staff: production view and execution.
- Warehouse Staff: inventory view and management.

## Screenshot

Screenshot placeholder: add a dashboard capture after the first environment-backed run.
