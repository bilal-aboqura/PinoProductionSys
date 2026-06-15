# Implementation Plan: Notifications and Alerts

**Branch**: `007-notifications-alerts` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/007-notifications-alerts/spec.md`

---

## Summary

Build a centralized, real-time in-app notification and alert system. The system automatically triggers alerts from production, inventory, batch, and warehouse events based on database/application state or custom alert rules configured by administrators. Users receive real-time notifications in-app via a header bell icon (with unread badge counts) and toast alerts, and can view their paginated history on a dedicated notifications page. The entire module operates under strict Role-Based Access Control (RBAC) to ensure notifications are routed only to permitted user roles.

---

## Technical Context

- **Language/Version**: TypeScript / Next.js 15
- **Primary Dependencies**: React 19, Tailwind CSS, shadcn/ui, Lucide React, SWR or EventSource (SSE)
- **Storage**: PostgreSQL (Supabase)
- **ORM**: Prisma (5.22.0)
- **Testing**: Vitest for unit tests (rule logic, alert routing), Playwright for integration/E2E (toast rendering, badge updating, history filtering, RBAC)
- **Target Platform**: Responsive Web (Desktop, Tablet, Large Mobile)
- **Project Type**: Web Application
- **Performance Goals**: Notification creation < 1s, Real-time delivery < 3s, Page load < 1s, Badge count API < 200ms
- **Constraints**: In-app notifications only. No SMTP/external messaging systems. Tabular history pages use pagination for > 50 rows. Automatic 90-day pruning is portable and decoupled from Vercel Crons, triggered by a secure internal Route Handler `/api/internal/notification-cleanup` invoked via a VPS Linux Cron Job using a Bearer token.
- **Scale/Scope**: Designed for 30+ concurrent users, scaling to thousands of notifications over a 90-day retention window.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: Consolidated relational design in Prisma replacing 6 separate tables with 3 highly optimized tables. Real-time updates delivered via Server-Sent Events (SSE) or robust client polling.
- [x] **II. Business First**: Empowers staff to act immediately on inventory shortages, batch expiration risk, and overdue production runs, reducing operational errors and waste.
- [x] **III. Traceability**: Preserves full audit-ready history of alert generation, delivery timestamp, user read confirmation, and archiving.
- [x] **IV. Consistent UX**: Employs standard brand colors (`#A14323` primary, `#F7F3EE` background) and follows established shadcn/ui patterns (dropdown popovers, dense tables, clear buttons).
- [x] **V. Responsive**: Notification header bell, toasts, and history page fully tested on desktop, tablet, and mobile breakpoints.
- [x] **VI. Performance**: Indexed querying and unread counts kept under 200ms using index-backed Prisma queries.
- [x] **VII. Security**: Notifications routed based on user's active RBAC permissions. Routes and Server Actions protected by session middleware.
- [x] **VIII. Testing**: Core rules, routing, and access permission gates fully covered by unit and integration tests.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-notifications-alerts/
├── spec.md              # Feature specification
├── plan.md              # This file (Technical Implementation Plan)
├── research.md          # Technology decisions (SSE vs Polling, Table Consolidation)
├── data-model.md        # Prisma schema updates & migration definitions
├── quickstart.md        # Verification scripts and run instructions
├── contracts/
│   └── api.md           # API signatures for server actions and SSE endpoints
└── checklists/
    └── requirements.md  # Requirements validation checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [locale]/
│       └── (protected)/
│           ├── notifications/
│               └── page.tsx               # Dedicated notifications history page
│           └── admin/
│               └── alert-rules/
│                   └── page.tsx           # Configurable alert rules screen
│   └── api/
│       └── internal/
│           └── notification-cleanup/
│               └── route.ts               # Secure portable cleanup handler (triggered by Linux cron)
├── components/
│   └── layout/
│       └── NotificationBell.tsx           # Header bell client component with popover
├── features/
│   └── notifications/
│       ├── actions.ts                     # Server Actions (markRead, archive, updateRule)
│       ├── queries.ts                     # Prisma queries (getUnreadCount, listHistory)
│       ├── engine.ts                      # Rules processing engine (checkThresholds)
│       ├── types.ts                       # Type definitions
│       └── validation.ts                  # Zod schemas for alert rules and filters
```

**Structure Decision**: Place all backend business logic, rule evaluations, and Prisma transactions under `src/features/notifications/` for separation of concerns. Expose the user interface via pages at `src/app/[locale]/(protected)/notifications/` and inject the interactive `NotificationBell` inside the global header `AppNav`.

---

## Complexity Tracking

*No violations detected. Complexity tracking is not required.*
