# Quickstart: User Authentication & Role Management

**Branch**: `001-user-auth-roles` | **Date**: 2026-06-12

Developer setup guide for the auth/role management module.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | bundled with Node 20 |
| Supabase project | — | Create at [supabase.com](https://supabase.com); free tier is sufficient |
| Git | any | already initialized |

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd PinoProductionSys
npm install
```

---

## 2. Environment Variables

Copy the example file and fill in values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Supabase — Transaction Pooler (port 6543) — used by Prisma at runtime
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Supabase — Direct connection (port 5432) — used by Prisma migrations ONLY
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Auth.js
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

# Session timeout (seconds) — default 8 hours
SESSION_MAX_AGE=28800
```

> **Where to find Supabase connection strings**: Supabase Dashboard → Your Project → Settings → Database → Connection string → select **Transaction pooler** (for `DATABASE_URL`) and **Direct connection** (for `DIRECT_URL`).

---

## 3. Database Setup

```bash
# Apply migrations and automatically enable RLS/default-deny security
npm run db:deploy

# Generate Prisma client
npx prisma generate
```

RLS hardening is included in `npm run db:deploy`. To reapply only the security
configuration without running migrations:

```bash
# Optional manual reapplication (normally included in db:deploy)
npm run db:security
```

The security script enables RLS on every public application table and grants no
direct table access or policies to `anon` and `authenticated`. Server-side Prisma
continues through the private PostgreSQL owner connection.

---

## 4. Seed Default Data

```bash
npx prisma db seed
```

This creates:
- 4 default roles with permission assignments
- 16 permission codes
- Sample scope dimension data (3 departments, 3 recipe categories, 2 production lines, 2 inventory areas)
- 1 default Administrator account

**Seed output** (printed to console):

```
✅ Roles seeded: administrator, supervisor, production_staff, warehouse_staff
✅ Permissions seeded: 16 permissions
✅ Scope data seeded
✅ Admin user created:
   Username: admin
   Email:    admin@pino.local
   Password: <temporary-password-here>   ← shown once, change on first login
```

---

## 5. Start Development Server

```bash
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

You will be redirected to `/ar/login` (Arabic default).

---

## 6. First Login

1. Navigate to `http://localhost:3000`
2. Log in with `admin` / `<seed-output-password>`
3. You will be redirected to `/ar/change-password`
4. Set a new password (min 8 chars, 1 uppercase, 1 number)
5. You now have full Administrator access

---

## 7. Running Tests

```bash
# Unit tests (permission resolver, audit logger, validators)
npx vitest run

# Watch mode during development
npx vitest

# E2E tests (requires dev server running on :3000)
npx playwright test

# E2E with UI
npx playwright test --ui
```

---

## 8. Useful Dev Commands

```bash
# Open Prisma Studio (visual DB browser)
npx prisma studio

# Reset DB and re-seed (destructive!)
npx prisma migrate reset

# Generate new migration after schema change
npx prisma migrate dev --name <description>

# Type-check without building
npx tsc --noEmit

# Lint
npm run lint
```

---

## 9. Creating a Test User via Admin UI

1. Log in as `admin`
2. Navigate to **الإعدادات → المستخدمون** (Settings → Users) or switch to English and go to **Admin → Users**
3. Click **إضافة مستخدم** / **Add User**
4. Fill in: Display Name, Username, Role
5. Optionally assign scope restrictions
6. Click **حفظ** / **Save**
7. Copy the temporary password shown — it will not appear again
8. Log in as the new user in a different browser/incognito window to test

---

## 10. Switching Language

The language toggle is in the top navigation bar (globe icon).

- **AR** → Arabic, RTL layout, Cairo font
- **EN** → English, LTR layout, Inter font

The selection persists for the session and is saved to the user's profile after login.

---

## 11. Environment File Reference (`.env.example`)

```env
# ─── Supabase / Database ───────────────────────────────────────────────────
# Transaction Pooler — runtime queries (port 6543)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection — Prisma migrations only (port 5432)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# ─── Auth.js ───────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# Session inactivity timeout in seconds (default: 28800 = 8 hours)
SESSION_MAX_AGE=28800

# ─── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME="Pino Production System"
NODE_ENV="development"
```
