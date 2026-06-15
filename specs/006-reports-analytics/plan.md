# Technical Implementation Plan: Reports and Analytics

**Branch**: `006-reports-analytics` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-reports-analytics/spec.md`

---

## Summary

Build a centralized reporting and analytics platform that provides operational visibility across production, inventory, warehouse operations, batches, waste tracking, and staff performance. The module is read-only and queries operational tables directly using optimized PostgreSQL views to guarantee page load speeds under 2 seconds and report retrieval under 5 seconds. Users can apply comprehensive filters, drill down from summary dashboards to detailed ledgers, export styled Excel sheets (via `exceljs`), print PDFs (via `pdfkit`), and archive scheduled daily, weekly, or monthly snapshots.

---

## Technical Context

- **Language/Version**: TypeScript / Next.js 15
- **Primary Dependencies**: React 19, Tailwind CSS, shadcn/ui, Recharts, `exceljs`, `pdfkit`
- **Storage**: PostgreSQL (Supabase)
- **ORM**: Prisma (5.22.0)
- **Testing**: Vitest for unit tests (data aggregation formulas), Playwright for end-to-end integration (filters, export downloads, RBAC routing)
- **Target Platform**: Responsive Web (Desktop, Tablet, Large Mobile)
- **Project Type**: Web Application
- **Performance Goals**: Dashboard Load < 2s, Report Generation < 5s, Excel Export < 10s, PDF Export < 10s
- **Constraints**: Read-only reports respecting RBAC permissions. Tabular data uses server-side pagination for > 50 rows.
- **Scale/Scope**: Supports 30+ concurrent users running aggregate queries on thousands of orders, batches, and inventory movements.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: No reporting database or heavy caching queues. Direct read-only queries against database views.
- [x] **II. Business First**: Provides critical operational monitoring (batches near expiry, low stock, waste reasons) directly impacting restaurant profit and compliance.
- [x] **III. Traceability**: Generates user actions and batch reprint/disposal audit logs to maintain complete history.
- [x] **IV. Consistent UX**: Built with standard shadcn/ui components, warm professional Brand Colors (`#A14323` primary, etc.), and Cairo/Inter typography.
- [x] **V. Responsive**: Layouts flex/grid-based and tested down to mobile viewport sizes.
- [x] **VI. Performance**: Large tables pagination, database indexing on date fields, and views keep response time under 300ms.
- [x] **VII. Security**: All pages protected by auth middleware. RBAC enforced at action level (e.g. Production staff limited to personal performance).
- [x] **VIII. Testing**: Core aggregate metrics and permission guards covered by unit and integration tests.

---

## Project Structure

### Documentation (this feature)

```text
specs/006-reports-analytics/
├── plan.md              # This file
├── research.md          # Technology decisions (ExcelJS, PDFKit, database views)
├── data-model.md        # DB views definitions and Prisma schema updates
├── quickstart.md        # Run and verification scenarios
├── contracts/
│   └── api.md           # API signatures for server actions and download endpoints
└── checklists/
    └── requirements.md  # Spec quality checklist (all passed)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [locale]/
│       └── (protected)/
│           └── reports/
│               ├── page.tsx               # Main Dashboard page (KPI cards, trends)
│               ├── production/
│               │   └── page.tsx           # Production reports UI
│               ├── inventory/
│               │   └── page.tsx           # Inventory reports UI
│               ├── batches/
│               │   └── page.tsx           # Batch reports UI
│               ├── waste/
│               │   └── page.tsx           # Waste reports UI
│               ├── warehouse/
│               │   └── page.tsx           # Warehouse reports UI
│               ├── staff/
│               │   └── page.tsx           # Staff performance reports UI
│               ├── audit/
│               │   └── page.tsx           # System audit reports UI
│               └── scheduled/
│                   └── page.tsx           # Scheduled reports configuration UI
├── features/
│   └── reports/
│       ├── actions.ts                         # Next.js Server Actions (exportExcel, exportPdf, createScheduledReport)
│       ├── queries.ts                         # Prisma queries using views/indexes for analytics
│       ├── types.ts                           # TS Types and request/response DTOs
│       └── validation.ts                      # Zod schemas for filters and scheduled reports
```

**Structure Decision**: Consolidate reports UI routes under `src/app/[locale]/(protected)/reports/` and place all Next.js Server Actions, Prisma query logic, and TypeScript definitions inside `src/features/reports/` to match modular patterns in preceding features.

---

## Complexity Tracking

*No violations detected. Complexity tracking is not required.*
