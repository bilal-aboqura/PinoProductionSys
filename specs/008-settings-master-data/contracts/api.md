# API Contracts & Interface Definitions: Settings and Master Data

## Next.js Server Actions

All settings modifications, master data adjustments, and audit log lookups will be exposed via Next.js Server Actions from `src/features/settings/actions.ts`.

### 1. Save System Settings
Saves global preferences, thresholds, or layout settings. Enforces Admin or System Manager role.

```typescript
export async function saveSystemSetting(
  key: "general_preferences" | "qr_config" | "notification_thresholds",
  value: Record<string, any>
): Promise<{ success: boolean; error?: string }>;
```
*   **Payload Validation**: Value is validated using corresponding Zod schemas (`generalPreferencesSchema`, `qrConfigSchema`, `notificationThresholdsSchema`).
*   **Audit Logging**: Computes diff between the database state and the new state, writing a `SYSTEM_SETTING_UPDATED` action to the audit logs.

---

### 2. Create Master Data Entity
Creates a new record for localized master data tables. Enforces Admin or System Manager role.

```typescript
export async function createMasterEntity(
  entityType: "departments" | "production_lines" | "warehouses" | "storage_conditions" | "label_templates" | "waste_reasons",
  data: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }>;
```
*   **Input**:
    *   `entityType`: Identifier for target model.
    *   `data`: Fields to populate (e.g. `nameAr`, `nameEn`, `code`, `description`, etc.).
*   **Audit Logging**: Writes `MASTER_DATA_CREATED` to audit logs.

---

### 3. Update Master Data Entity
Modifies localized master data details. Enforces Admin or System Manager role.

```typescript
export async function updateMasterEntity(
  entityType: "departments" | "production_lines" | "warehouses" | "storage_conditions" | "label_templates" | "waste_reasons",
  id: string,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string }>;
```
*   **Audit Logging**: Compares database record with updated fields, writing `MASTER_DATA_UPDATED` containing `previousValue` and `newValue` JSON strings.

---

### 4. Archive Master Data Entity
Soft-deletes/archives an entity by setting `isActive` to `false`. Enforces Admin or System Manager role.

```typescript
export async function archiveMasterEntity(
  entityType: "departments" | "production_lines" | "warehouses" | "storage_conditions" | "label_templates" | "waste_reasons",
  id: string
): Promise<{ success: boolean; error?: string }>;
```
*   **Behavior**: Blocks physical deletion, updates `isActive = false`, and writes a `MASTER_DATA_ARCHIVED` action to the audit logs.

---

### 5. Restore Master Data Entity
Restores a soft-archived entity by setting `isActive` to `true`. Enforces Admin or System Manager role.

```typescript
export async function restoreMasterEntity(
  entityType: "departments" | "production_lines" | "warehouses" | "storage_conditions" | "label_templates" | "waste_reasons",
  id: string
): Promise<{ success: boolean; error?: string }>;
```
*   **Behavior**: Updates `isActive = true` and writes a `MASTER_DATA_RESTORED` action to the audit logs.

---

### 6. Get Audit Logs
Queries system audit log records with filters and pagination. Enforces Supervisor role or above.

```typescript
export async function getAuditLogs(params: {
  page?: number;
  pageSize?: number;
  actorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  logs: Array<{
    id: string;
    createdAt: Date;
    actorName: string;
    action: string;
    targetName: string | null;
    previousValue: any | null;
    newValue: any | null;
  }>;
  totalPages: number;
  totalCount: number;
}>;
```
