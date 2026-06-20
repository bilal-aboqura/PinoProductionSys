# Implementation Plan: Recipe Costing & Nutrition Analysis

**Branch**: `main` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/010-recipe-costing-nutrition/spec.md`

## Summary

Extend the existing recipe, inventory, printing, and reporting modules so the platform can calculate recipe cost, recipe calories, cost per yield unit, calories per yield unit, calories per serving, and historical profitability without introducing a standalone costing service. The design reuses the existing inventory item master, stores normalized ingredient reference profiles with effective dates, freezes calculation and selling-price snapshots on recipe versions, and enriches print/report flows with queryable nutrition and cost outputs.

## Technical Context

**Language/Version**: TypeScript / Next.js 15  
**Primary Dependencies**: React 19, Prisma 5.22.0, Zod, NextAuth 5 beta, next-intl, ExcelJS, PDFKit  
**Storage**: PostgreSQL via Prisma (Supabase-hosted deployment model)  
**Testing**: Vitest for unit/business-logic tests, Playwright for end-to-end workflow and permissions tests  
**Target Platform**: Responsive web application for desktop, tablet, and large mobile browsers  
**Project Type**: Full-stack web application  
**Performance Goals**: Calculation preview refresh <= 2s, recipe version save <= 2s, label data generation <= 3s, report filtering <= 500ms, report pages <= 3s  
**Constraints**: Historical calculation outputs must be immutable once versioned; recipe ingredient lines must reference master records only; `PIECE` is non-convertible; profitability must use the selling price active when the snapshot was saved; RBAC and audit logging are mandatory for master-data and recipe changes  
**Scale/Scope**: 30+ concurrent users, thousands of production and inventory records, dozens of active recipes, and report tables that require server-side pagination once result sets exceed 500 rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: Extends existing recipe, inventory, printing, and reporting modules instead of introducing a separate calculation service or duplicate ingredient catalog.
- [x] **II. Business First**: Removes spreadsheet-based costing/calorie work and standardizes label/report outputs for kitchen and management workflows.
- [x] **III. Traceability**: Uses immutable recipe-version snapshots, effective-dated ingredient reference profiles, and audit logs for who/when/what changed.
- [x] **IV. Consistent UX**: Reuses the established recipe forms, inventory master-data patterns, report tables, and print payload builders.
- [x] **V. Responsive**: Recipe edit, report, and print-data workflows remain inside the existing responsive Next.js application shell.
- [x] **VI. Performance**: Keeps calculations local to existing server actions/query helpers, uses indexed snapshot columns for report sorting/filtering, and avoids heavy cross-service calls.
- [x] **VII. Security**: Continues to enforce permission-based access through existing recipe, printing, report, and system configuration guards.
- [x] **VIII. Testing**: Plans unit tests for conversion/calculation/snapshot logic and integration tests for recipe editing, historical immutability, report visibility, and label payload generation.

## Project Structure

### Documentation (this feature)

```text
specs/010-recipe-costing-nutrition/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- api.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
prisma/
`-- schema.prisma

src/
|-- app/
|   |-- api/
|   |   `-- reports/
|   |       `-- export/route.ts
|   `-- [locale]/
|       |-- (protected)/
|       |   |-- inventory/
|       |   |   `-- items/page.tsx
|       |   |-- printing/
|       |   |   `-- page.tsx
|       |   |-- recipes/
|       |   |   |-- new/page.tsx
|       |   |   |-- [id]/page.tsx
|       |   |   `-- [id]/versions/page.tsx
|       |   `-- reports/
|       |       |-- page.tsx
|       |       `-- recipes/page.tsx
|       `-- printing/
|           `-- label/[id]/page.tsx
|-- components/
|   `-- recipes/
|       |-- IngredientEditor.tsx
|       |-- RecipeForm.tsx
|       |-- RecipeListTable.tsx
|       `-- VersionHistoryTable.tsx
|-- features/
|   |-- inventory/
|   |   |-- actions.ts
|   |   |-- types.ts
|   |   |-- validation.ts
|   |   `-- lib/unit-converter.ts
|   |-- printing/
|   |   |-- actions.ts
|   |   `-- types.ts
|   |-- recipes/
|   |   |-- actions.ts
|   |   `-- types.ts
|   `-- reports/
|       |-- queries.ts
|       `-- types.ts
`-- lib/
    |-- permissions.ts
    `-- recipes/
        |-- calculations.ts
        |-- reference-profiles.ts
        |-- snapshot.ts
        `-- validate-publish.ts
```

**Structure Decision**: Keep ingredient costing/nutrition master data anchored to the existing inventory and recipe modules, add shared calculation helpers under `src/lib/recipes/`, persist immutable values on `RecipeVersion`, and extend the current reports/printing flows instead of creating a parallel costing subsystem.

## Complexity Tracking

*No constitutional violations detected. Complexity tracking is not required.*
