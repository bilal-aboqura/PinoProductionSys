# Technical Implementation Plan: Batch Management, QR Code, and Label Printing

**Branch**: `005-batch-mgmt-traceability` | **Date**: 2026-06-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/005-batch-mgmt-traceability/spec.md`

---

## Summary

Build a comprehensive batch management and product traceability module for finished products. When a production order transitions to `COMPLETED`, the system will automatically generate a unique, sequential batch identifier (`B-YYYY-NNNNN`), calculate its expiry date using the recipe's shelf life, generate a QR code linking to a gated traceability detail view, and create the corresponding inventory balances and ledger entries. The module also supports container-based splitting, label template rendering (Small, Standard, Large), audited reprinting, and batch disposal/waste logging.

---

## Technical Context

* **Language/Version**: TypeScript / Next.js 15
* **Primary Dependencies**: React 19, Tailwind CSS, shadcn/ui, Zod, Lucide Icons, `qrcode` (npm package)
* **Storage**: PostgreSQL (Supabase)
* **ORM**: Prisma (5.22.0)
* **Testing**: Vitest for unit tests, Playwright for integration testing
* **Target Platform**: Responsive Web (Desktop, Tablet, Large Mobile)
* **Project Type**: Web Application
* **Performance Goals**: Batch lookup < 500ms, QR scan lookup < 1s, Label compilation/generation < 2s
* **Constraints**: Traceability page is fully gated (no public exposure of internal production/recipe data); batch IDs are immutable and unique; all label prints and status updates are logged.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: No complex queueing or background worker systems for batch creation; everything executes in atomic database transactions during order completion.
- [x] **II. Business First**: Provides essential traceability logs and printable barcode/QR labels to prevent kitchen/warehouse errors.
- [x] **III. Traceability**: All prints, status updates, and disposals log the actor, timestamp, and context in immutable tables (`BatchPrintHistory`, `BatchStatusHistory`, `BatchAuditLog`).
- [x] **IV. Consistent UX**: UI features utilize shadcn/ui components and align with Brand Colors (`#A14323` primary, etc.) and Inter/Cairo typography.
- [x] **V. Responsive**: The batch dashboard, search, and detail screens are designed using flexbox/grid layout and tested down to mobile sizes.
- [x] **VI. Performance**: Indexed queries keep load times under 500ms. Bulk tables utilize pagination.
- [x] **VII. Security**: Access is fully gated using RBAC permissions (Production, Warehouse, Supervisor, Admin roles).
- [x] **VIII. Testing**: Core logic (expiry math, print history triggers, disposal ledger math) is covered by unit tests.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-batch-mgmt-traceability/
├── plan.md              # This file
├── research.md          # Phase 0 output (QR generation, CSS print layouts)
├── data-model.md        # Phase 1 output (Prisma schema models)
├── quickstart.md        # Phase 1 output (validation/run scenarios)
├── contracts/
│   └── server-actions.md # Phase 1 output (Server Action contract signatures)
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [locale]/
│       └── (protected)/
│           └── inventory/
│               └── batches/
│                   ├── page.tsx               # Batch list search, status, and filter UI
│                   ├── [batchNumber]/
│                   │   └── page.tsx           # Traceability details page (gated)
│                   └── _components/           # Reusable tables, print preview, disposal modal
├── features/
│   └── batches/
│       ├── actions.ts                         # Next.js Server Actions (create, print, dispose, update)
│       ├── queries.ts                         # Database queries (traceability retrieval, list fetcher)
│       ├── types.ts                           # TS Types and request/response DTOs
│       └── validation.ts                      # Zod validation schemas
```

**Structure Decision**: Place the routing files under `src/app/[locale]/(protected)/inventory/batches/` and encapsulate core business rules, queries, and Server Actions inside `src/features/batches/` to maintain a modular architecture consistent with prior modules.

---

## Complexity Tracking

*No violations detected. Complexity tracking is not required.*
