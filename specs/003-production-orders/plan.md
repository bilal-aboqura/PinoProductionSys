# Implementation Plan: Production Orders

**Branch**: `003-production-orders` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/003-production-orders/spec.md`

## Summary

Build a production order management module that allows authorized users to create production orders from published recipe versions and guides production staff through a structured, sequential workflow. The module enforces step-level evidence requirements (photo, notes, quantity confirmation), tracks production time automatically, and produces an immutable completion record that serves as the traceability anchor for inventory consumption, batch creation, and QR labeling.

The module extends the existing Next.js 15 / Prisma / Supabase / shadcn stack following the established feature architecture (`src/features/production-orders/`), Server Actions pattern, and RBAC permission model already used by the recipes module.

---

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 15 (App Router)  
**Primary Dependencies**: Prisma ORM, Supabase Storage (photo uploads), next-auth (session), shadcn/ui, Zod (validation), React 19  
**Storage**: PostgreSQL via Supabase (Prisma), Supabase Storage bucket for step photos  
**Testing**: Vitest (unit), Playwright (integration/E2E), custom permission test harness  
**Target Platform**: Web — desktop primary, tablet/mobile responsive  
**Performance Goals**: Order list ≤ 500 ms, order detail ≤ 1 s, photo upload ≤ 3 s, step complete ≤ 300 ms interactive  
**Constraints**: All routes authenticated via existing middleware; RBAC via existing permission system; no destructive deletes  
**Scale/Scope**: Thousands of production orders, thousands of photos, 30+ concurrent staff members

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

- [x] **I. Simplicity**: No new abstractions introduced beyond the established feature pattern. Complexity of concurrent-access protection is justified by data integrity requirements.
- [x] **II. Business First**: Feature directly addresses core production workflow, staff accountability, and traceability — primary operational need of the platform.
- [x] **III. Traceability**: Full who/when/what captured at order creation, every status transition, every step completion, every photo upload, and cancellation. Immutable audit log planned per action.
- [x] **IV. Consistent UX**: UI uses existing shadcn/ui components, design tokens, table/form/card patterns, and navigation hierarchy from the established design system.
- [x] **V. Responsive**: All screens designed for desktop, tablet, and large mobile — tested at each breakpoint before release.
- [x] **VI. Performance**: Paginated list server-side; step detail fetched on-demand; photos loaded lazily. All targets within constitution thresholds.
- [x] **VII. Security**: New permission codes follow `production-orders:*` pattern; category-scoped creation enforced at action layer; all routes protected by existing auth middleware.
- [x] **VIII. Testing**: Unit tests for all business logic (step enforcement, status transitions, snapshot locking); integration tests for full order lifecycle; permission tests for each RBAC gate.

No violations. Complexity Tracking table not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-production-orders/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   ├── server-actions.md
│   └── storage.md
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
src/
├── features/
│   └── production-orders/
│       ├── actions.ts          ← All Server Actions (create, claim, start, step, complete, cancel)
│       ├── queries.ts          ← Read-only data fetchers for Server Components
│       ├── types.ts            ← DTOs and domain types
│       └── lib/
│           ├── permissions.ts  ← Permission constants for production-orders
│           ├── audit.ts        ← writeProductionAuditLog helper
│           └── status.ts       ← Status transition guard functions
├── lib/
│   └── production-orders/
│       └── snapshot.ts         ← buildOrderSnapshot util (reads RecipeVersion.snapshot)
├── app/
│   └── [locale]/
│       └── (protected)/
│           └── production/
│               ├── page.tsx                    ← Order list (supervisor/admin view)
│               ├── queue/
│               │   └── page.tsx                ← Unassigned queue (staff self-claim)
│               ├── [id]/
│               │   ├── page.tsx                ← Order detail / execution view
│               │   └── cancel/
│               │       └── page.tsx            ← Cancel confirmation
│               └── new/
│                   └── page.tsx                ← Create order form
└── components/
    └── production-orders/
        ├── OrderListTable.tsx
        ├── OrderStatusBadge.tsx
        ├── OrderDetailHeader.tsx
        ├── StepExecutionCard.tsx
        ├── StepPhotoUploader.tsx
        ├── StepNotesInput.tsx
        ├── StepQuantityConfirm.tsx
        ├── StartProductionButton.tsx
        ├── CompleteOrderButton.tsx
        └── CancelOrderDialog.tsx
```

---

## Complexity Tracking

> No constitution violations. Table omitted per instructions.
