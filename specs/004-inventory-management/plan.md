# Technical Implementation Plan: Inventory Management & Material Consumption

**Branch**: `004-inventory-management` | **Date**: 2026-06-13 | **Spec**: [spec.md](file:///f:/CodingProjects/PinoProductionSys/specs/004-inventory-management/spec.md)
**Input**: Feature specification from `specs/004-inventory-management/spec.md`

## Summary

Build an inventory management and material consumption module to track stock levels, movements, transfers, manual adjustments, and kitchen waste. When production orders are completed, the system automatically calculates and deducts raw materials based on the production ratio, while adding finished products to stock. The system enforces global visibility, location-scoped action permissions via `UserWarehouse`, and a hybrid negative stock policy.

## Technical Context

- **Language/Version**: TypeScript / Next.js 15
- **Primary Dependencies**: React, Tailwind CSS, shadcn/ui, Lucide Icons, Zod
- **Storage**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Testing**: Vitest for unit tests, Playwright for integration testing
- **Target Platform**: Responsive Web (Desktop, Tablet, Large Mobile)
- **Project Type**: Web Application
- **Performance Goals**: Balances dashboard load < 500ms, detail views < 1s, movement history < 1s
- **Constraints**: Database changes must be fully backwards compatible; all stock movements are immutable; negative stock is only allowed for production consumption with warnings.
- **Scale/Scope**: Support up to thousands of inventory items, hundreds of warehouses, and tens of thousands of stock movements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: No unnecessary abstractions introduced. No complex queueing or background worker systems for inventory updates; everything executes in atomic DB transactions.
- [x] **II. Business First**: Tracks wastage, transfers, and inventory levels in real-time, providing immediate operational value to kitchen and warehouse staff.
- [x] **III. Traceability**: Every stock change is permanently logged as an immutable Stock Movement entry linking the user, timestamp, quantity, and source transaction ID.
- [x] **IV. Consistent UX**: The stock dashboard and catalog views will use shadcn/ui components, following the established design system tokens and Cairo/Inter typography.
- [x] **V. Responsive**: The dashboards and lists will be built using flexbox and grid layouts, tested down to tablet/mobile screens.
- [x] **VI. Performance**: Current balances are cached in `inventory_balances` to keep dashboard queries under 500ms. Large tables are paginated.
- [x] **VII. Security**: Enforces RBAC permissions and gates all mutation actions using `UserWarehouse` scoping.
- [x] **VIII. Testing**: Core ledger math, unit conversions, and location-scoping checks will be covered by Vitest tests.

No violations detected. Complexity tracking is not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-inventory-management/
├── plan.md              # This file
├── research.md          # Phase 0 output (concurrency, unit conversions)
├── data-model.md        # Phase 1 output (Prisma schema models)
├── quickstart.md        # Phase 1 output (runnable validation scenarios)
├── contracts/
│   └── server-actions.md # Phase 1 output (API signatures & contracts)
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [locale]/
│       └── (protected)/
│           ├── inventory/             # Stock levels dashboard, adjustments UI, transfers UI
│           │   ├── page.tsx
│           │   ├── history/
│           │   │   └── page.tsx        # Movement history ledger
│           │   └── _components/        # Dashboard layout, forms, tables
│           └── items/                 # Catalog management UI
│               ├── page.tsx
│               └── _components/        # Catalog tables and forms
├── features/
│   └── inventory/                     # Feature business logic and data access
│       ├── actions.ts                 # Next.js Server Actions (transfers, adjustments, items)
│       ├── queries.ts                 # Database queries (balances, movement ledger)
│       ├── types.ts                   # Types and request DTOs
│       └── validation.ts              # Zod validation schemas
```

**Structure Decision**: We will place routing files under `src/app/[locale]/(protected)/` and group reusable forms, tables, and buttons under `_components/` subdirectories. All core business rules, database queries, validation, and Server Actions will be encapsulated in `src/features/inventory/` to keep the layout modular and highly maintainable.
