# Research and Technology Decisions: Settings and Master Data

## 1. Dynamic System Settings Storage

### Decision
Store system preferences, defaults, and thresholds in a single database table named `system_settings` with key-value pairs where the `value` field is a PostgreSQL `JSONB` type.

### Rationale
- Storing each setting as an individual column in a single-row table makes schema changes brittle. Adding a new configuration toggle would require a database migration.
- Storing settings as rows in a `system_settings` table where the value is JSONB allows structured settings (e.g., QR config, layout options, notification thresholds) to be added dynamically without modifying the database schema.
- Key lookup is highly performant (`key` field is unique and indexed).

### Alternatives Considered
- **Single-row config table**: Rejected because it requires a database schema migration every time a new system setting is introduced.
- **Environment variables only**: Rejected because administrators cannot modify environment variables dynamically through the UI without restarting the application or modifying deployments.

---

## 2. Soft Archiving Pattern

### Decision
Implement soft archiving using an `isActive` (boolean) flag on all master data tables (`recipe_categories`, `departments`, `storage_conditions`, `warehouses`).

### Rationale
- Hard deleting master data is strictly prohibited to maintain referential integrity. If a department or storage condition is linked to historical recipes or inventory movements, deleting it would cause SQL foreign key violations or data loss.
- Soft archiving hides the deactivated records from active select boxes and creation screens while preserving relations in database tables.
- Standard Prisma queries for active master data will filter `isActive: true`, while historical reports can query the database without this filter.

### Alternatives Considered
- **Separate Archival Tables**: Rejected because moving records to archive tables breaks foreign key constraints on historical data.
- **Nullable Foreign Keys**: Setting foreign keys to `NULL` on deletion is rejected because it destroys historical context (e.g., losing the name of the warehouse where an inventory transaction originally occurred).

---

## 3. Configuration Audit Diffing

### Decision
Generate and log JSON diffs (before/after states) directly within Next.js Server Actions prior to executing database updates, writing to the system `audit_logs` table.

### Rationale
- Creating audit logs at the application level (within Server Actions) allows capturing the specific user performing the action (`userId` from the session) alongside the before/after JSON states.
- Diffing in Server Actions is easy to unit test and keeps database triggers simple and lightweight.
- Log structures are immutable by enforcing only `INSERT` capabilities on the `audit_logs` Prisma model.

### Alternatives Considered
- **Database Triggers (PgAudit / Auditing Triggers)**: Rejected because passing the authenticated application user ID (from Next-Auth) down to PostgreSQL session states adds database routing complexity and overhead.

---

## 4. Administrative Role-Based Access Control (RBAC)

### Decision
Secure administrative settings routes and actions using Next.js middleware and Server Action permission checks.

### Rationale
- Route guarding is performed in `src/middleware.ts` for path-level protection (blocking `/admin/*` from non-admins).
- Server Actions enforce secondary security checks by resolving the user session and verifying that they have the `Admin` or `System Manager` role before executing database queries, following the principle of least privilege.
