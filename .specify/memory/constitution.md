<!--
SYNC IMPACT REPORT
==================
Version change: [CONSTITUTION_VERSION] → 1.0.0 (initial ratification)

Modified principles: N/A (initial population from template)

Added sections:
  - Core Principles (8 principles)
  - UI Design System
  - Governance

Removed sections: N/A

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates updated
  ✅ .specify/templates/spec-template.md — No structural changes required; aligns with principles
  ✅ .specify/templates/tasks-template.md — Aligns with testing, traceability, and RBAC task types

Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Confirm exact project kick-off date if different from 2026-06-12.
-->

# PinoProductionSys Constitution

## Core Principles

### I. Simplicity Over Complexity

The system MUST prioritize simplicity, clarity, and maintainability over unnecessary abstractions.

Every feature MUST be easy to understand, easy to extend, and easy to debug. Complexity MUST be
explicitly justified. If a simpler design can achieve the same outcome, the simpler design wins.
Gold-plating, premature optimization, and over-engineering are violations of this principle.

### II. Business First

All design and implementation decisions MUST prioritize business workflows and operational efficiency.

The system serves restaurant production teams, warehouse staff, supervisors, and administrators.
The primary goal is reducing operational errors and increasing production traceability. Technical
elegance is secondary to user-facing value. Features without a clear operational benefit MUST NOT
be introduced.

### III. Production Traceability

Every production-related action MUST be fully traceable.

The system MUST always preserve:
- **Who** performed an action (authenticated user identity)
- **When** it was performed (ISO 8601 UTC timestamp)
- **What** was changed (before/after state or delta)

Production records MUST never lose historical context. Soft-deletes and audit logs are REQUIRED
for all production entities. Destructive operations that permanently erase history are prohibited
without explicit architectural justification and approval.

### IV. Consistent User Experience

All screens MUST follow a consistent layout and interaction pattern.

Non-negotiable requirements:
- Predictable, hierarchical navigation (no dead ends)
- Consistent spacing using the design system tokens
- Consistent table design (dense, sortable, filterable)
- Consistent form patterns (validation messages always visible)
- Consistent button hierarchy (primary / secondary / danger)
- Clear status indicators for all operational states

Introducing one-off UI patterns that deviate from the design system MUST be justified and reviewed.

### V. Mobile-Friendly Desktop Experience

The primary platform is web. The application MUST function efficiently on desktop, tablet, and
large mobile screens.

Responsive design is REQUIRED. Breakpoints MUST be tested before any feature is considered
complete. Layout degradation on tablet/mobile is a bug, not a "future enhancement."

### VI. Performance Standards

The system MUST meet the following performance requirements:
- Initial page load: ≤ 3 seconds
- Dashboard interactions: ≤ 300 ms
- Search and filtering: ≤ 500 ms
- Large tables MUST use pagination (server-side preferred for datasets > 500 rows)

Performance MUST remain acceptable under realistic load:
- 30+ concurrent users
- Thousands of production records
- Thousands of inventory transactions

Performance regressions introduced by new features are treated as bugs and MUST be resolved
before release.

### VII. Security Standards

The system MUST enforce the following security requirements:
- Role-Based Access Control (RBAC) for all features
- Principle of least privilege — users access only what their role permits
- All routes MUST be protected by authentication middleware
- Secure, session-managed authentication (tokens MUST expire)
- Sensitive operations MUST log the actor and timestamp

Users MUST only access features permitted by their assigned role. Security gaps are treated as
P0 bugs.

### VIII. Testing Standards

Every feature MUST include:
- Unit tests for all business logic
- Integration tests for end-to-end workflows
- Validation testing (boundary and error scenarios)
- Permission testing (verify role-gated access)

Critical workflows (production record creation, inventory adjustment, user role changes) MUST be
covered by integration tests and verified before any release. Test coverage for business logic
MUST NOT fall below 80%.

---

## UI Design System

### Design Style

The interface MUST feel: **Premium · Professional · Warm · Operational · Clean · Minimal**

The following aesthetics are explicitly prohibited:
- Bright neon colors
- Excessive or distracting animations
- Gaming-style interfaces
- Overly technical or developer-aesthetic UI

### Brand Colors

| Role        | Value     |
|-------------|-----------|
| Primary     | `#A14323` |
| Secondary   | `#665936` |
| Background  | `#F7F3EE` |
| Surface     | `#FFFFFF` |
| Accent      | `#E1CEBE` |
| Success     | `#4F7A52` |
| Warning     | `#D6A04C` |
| Error       | `#C65A5A` |

All UI components MUST use these tokens. Ad-hoc color values are not permitted outside the
design system.

### Typography

- **Arabic**: Cairo (Google Fonts)
- **English**: Inter (Google Fonts)

Requirements:
- Clear typographic hierarchy (H1 → H2 → H3 → body → caption)
- Large, readable table text
- High-contrast text (WCAG AA minimum)
- Accessibility-focused font sizing (no text below 13px in production use)

### Component Standards

**Cards**
- Soft box shadows
- Rounded corners (consistent border-radius token)
- Clean, consistent internal spacing

**Tables**
- Dense but readable row height
- Sortable columns
- Filterable with visible search/filter controls

**Forms**
- Simple layout with minimal visual distractions
- Inline validation messages (always visible when triggered)
- Clear field labels and required indicators

### Dashboard Philosophy

Dashboards MUST prioritize operational visibility. The most important information appears first:

1. Production status
2. Inventory status
3. Pending tasks
4. Reports
5. Administration

Lower-priority widgets MUST NOT visually compete with higher-priority operational indicators.

---

## Governance

This constitution supersedes all other project conventions, style guides, and ad-hoc decisions.
Any conflict between this document and other guidelines is resolved in favor of the constitution.

**Amendment procedure**:
1. Propose change in writing, referencing the affected principle(s).
2. Obtain explicit approval from the project lead.
3. Update this document with the new version and amendment date.
4. Propagate changes to all dependent templates (plan, spec, tasks).
5. Document the migration plan for any in-flight features affected.

**Versioning policy** (semantic versioning):
- **MAJOR**: Backward-incompatible principle removals or redefinitions.
- **MINOR**: New principles or materially expanded guidance added.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

**Compliance review**: Every implementation plan MUST include a Constitution Check gate that
validates adherence before Phase 0 research and again after Phase 1 design. Violations MUST be
documented in the Complexity Tracking table with explicit justification.

**Version**: 1.0.0 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-06-12
