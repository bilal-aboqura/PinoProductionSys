# Technical Implementation Plan: Settings and Master Data

**Branch**: `008-settings-master-data` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/008-settings-master-data/spec.md`

---

## Summary

Build a centralized administration module for managing operational reference data (Departments, Production Lines, Warehouses, Storage Conditions, Recipe Categories, and Label/QR Settings) and system-wide preferences. This module enforces role-based access control (Admin has write access, Supervisor has read-only access, others have no access), soft-archives deleted records to maintain historical referential integrity, and generates immutable audit log entries with before/after JSON diffs for all configuration changes, which are retained indefinitely.

---

## Technical Context

**Language/Version**: TypeScript / Next.js 15
**Primary Dependencies**: React 19, Tailwind CSS, shadcn/ui, Prisma
**Storage**: PostgreSQL (Supabase)
**ORM**: Prisma (5.22.0)
**Testing**: Vitest for unit tests (audit log formatting, setting validations), Playwright for end-to-end integration (RBAC guards, CRUD operations, soft-archiving validation)
**Target Platform**: Responsive Web (Desktop, Tablet, Large Mobile)
**Project Type**: Web Application
**Performance Goals**: Settings Page load < 1s, Save Operations < 2s, Search & Filter < 500ms
**Constraints**: Enforce RBAC (Admin write, Supervisor read, others blocked). All configurations must use soft archiving (no hard deletes). Audit logs must be immutable and retained indefinitely.
**Scale/Scope**: Administrative access only (1-5 active admins), logging all changes against thousands of historical records.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: Standard CRUD server actions. No complex caching layers or key-value stores. PostgreSQL is used directly for settings.
- [x] **II. Business First**: Essential for configuring warehouses, storage rules, and categories that block or enable daily operations.
- [x] **III. Traceability**: All settings changes record who, when, and what changed (previous vs new JSON state) in an immutable log retained indefinitely.
- [x] **IV. Consistent UX**: Built with standard shadcn/ui tables, dialogs, forms, and brand-standard typography (Cairo/Inter) and colors.
- [x] **V. Responsive**: Grid/flex layouts tested down to tablet and mobile screens.
- [x] **VI. Performance**: Simple indexed queries for settings to ensure load times < 1s and search < 500ms.
- [x] **VII. Security**: Protected routes and actions via RBAC.
- [x] **VIII. Testing**: Playwright tests verifying role restrictions and soft-archiving rules.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-settings-master-data/
├── plan.md              # This file
├── research.md          # Technology decisions (Prisma JSON schemas, Audit structure)
├── data-model.md        # Prisma schema updates for master data & settings
├── quickstart.md        # Run and verification scenarios
├── contracts/
│   └── api.md           # Next.js Server Actions signatures
└── checklists/
    └── requirements.md  # Spec quality checklist (passed)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [locale]/
│       └── (protected)/
│           └── admin/
│               └── settings/
│                   ├── page.tsx               # Main Settings & Preferences UI
│                   ├── departments/
│                   │   └── page.tsx           # Departments Management CRUD
│                   ├── warehouses/
│                   │   └── page.tsx           # Warehouses Management CRUD
│                   ├── categories/
│                   │   └── page.tsx           # Recipe Categories CRUD
│                   ├── conditions/
│                   │   └── page.tsx           # Storage Conditions CRUD
│                   ├── templates/
│                   │   └── page.tsx           # Label & QR Templates CRUD
│                   └── audit/
│                       └── page.tsx           # Audit Log Viewer Page
├── features/
│   └── settings/
│       ├── actions.ts                         # Server Actions (saveSettings, createMasterEntity, archiveMasterEntity, etc.)
│       ├── queries.ts                         # Prisma queries for settings, master data, and audit logs
│       ├── types.ts                           # Types and interfaces for preferences and settings schema
│       └── validation.ts                      # Zod schemas for system settings and master data entities
```

**Structure Decision**: Place administrative routing under `src/app/[locale]/(protected)/admin/settings/` and consolidate all data operations, actions, validation, and types inside `src/features/settings/` for clean modular boundary division.

---

## Complexity Tracking

*No violations detected. Complexity tracking is not required.*
