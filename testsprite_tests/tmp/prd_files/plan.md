# Technical Implementation Plan: Printing and Device Integration

**Branch**: `009-printing-device-integration` | **Date**: 2026-06-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/009-printing-device-integration/spec.md`

---

## Summary

Build a printing and device integration module that enables printing product, container, batch, and warehouse labels on thermal or standard document printers directly via standard web browsers. The module generates styled HTML/CSS print templates and PDF labels with embedded scannable QR codes (using the `qrcode` library). It features print queue monitoring, reprint logging with reason tracking, print history audits, and integration with keyboard-emulating USB/Bluetooth barcode and QR scanners. All operations are role-gated under RBAC, online-only in V1, and audit-logged indefinitely.

---

## Technical Context

**Language/Version**: TypeScript / Next.js 15
**Primary Dependencies**: React 19, Tailwind CSS, shadcn/ui, Prisma, qrcode
**Storage**: PostgreSQL (Supabase)
**ORM**: Prisma (5.22.0)
**Testing**: Vitest for unit tests (QR generation, print queue transitions, reprint permissions), Playwright for integration tests (browser print layout triggers, barcode emulation inputs, RBAC restrictions)
**Target Platform**: Responsive Web (Desktop, Tablet, Large Mobile)
**Project Type**: Web Application
**Performance Goals**: Label generation < 2s, PDF rendering < 3s, Print job creation < 1s, Print history search < 500ms
**Constraints**: Online-only printing in V1 (strict session & internet requirements). Print logs must be immutable and audit-logged indefinitely. Scanners must operate purely under keyboard emulation mode (no Web Serial/Bluetooth APIs).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with the PinoProductionSys Constitution before proceeding:

- [x] **I. Simplicity**: Uses standard browser-native printing capabilities (`window.print()`) and styled HTML/CSS templates. Avoids complex local bridge clients or raw ESC-POS/ZPL commands.
- [x] **II. Business First**: Essential for physical food safety labeling, container tracking, and rapid item scanning in daily kitchen workflows.
- [x] **III. Traceability**: Generates immutable audit logs for every print, reprint, and printer configuration change, with mandatory reprint reasons, retained indefinitely.
- [x] **IV. Consistent UX**: Print previews, printer configuration modals, and print history tables follow brand-standard Cairo/Inter styling and shadcn/ui structures.
- [x] **V. Responsive**: Admin printer settings and queue dashboards tested down to tablet and mobile viewports.
- [x] **VI. Performance**: Indexed search on print history tables to keep lookup times under 500ms; lightweight canvas-based QR rendering for instant preview.
- [x] **VII. Security**: RBAC enforced at action level (e.g. Printer config restricted to Admin, print job retry restricted to Supervisors/Admins).
- [x] **VIII. Testing**: Playwright end-to-end verification covering print queue flow, scanner text capture, and RBAC blockades.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-printing-device-integration/
├── plan.md              # This file
├── research.md          # Technology decisions (Browser printing vs ZPL, Scanner behavior)
├── data-model.md        # Prisma schema updates for print tables
├── quickstart.md        # Run and verification scenarios
├── contracts/
│   └── api.md           # API signatures for Server Actions and print endpoints
└── checklists/
    └── requirements.md  # Spec quality checklist (passed)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── [locale]/
│       └── (protected)/
│           ├── admin/
│           │   └── printers/
│           │       └── page.tsx           # Printer Configuration UI (Admin only)
│           ├── printing/
│           │   ├── page.tsx               # Print Queue & History Dashboard
│           │   └── label/
│           │       └── [id]/page.tsx      # Standalone Print-ready HTML Label Layout
├── features/
│   └── printing/
│       ├── actions.ts                         # Server Actions (createPrintJob, recordReprint, savePrinterConfig, etc.)
│       ├── queries.ts                         # Prisma queries for printing tables
│       ├── types.ts                           # Types for print templates and formats
│       └── validation.ts                      # Zod validation schemas
```

**Structure Decision**: Expose administrative printer management at `/admin/printers/`, consolidate active queue/history at `/printing/`, render bare print-ready layouts on isolated routes under `/printing/label/[id]/` (to prevent navbar/header components from rendering during client printing), and group backend logic inside `src/features/printing/`.

---

## Complexity Tracking

*No violations detected. Complexity tracking is not required.*
