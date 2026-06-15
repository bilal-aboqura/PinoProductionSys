# API Contracts & Interface Definitions: Printing and Device Integration

## Next.js Server Actions

All print operations, configuration updates, scanner mappings, and logs query actions are exposed via Next.js Server Actions in `src/features/printing/actions.ts`.

### 1. Manage Printer Configuration
Saves or updates physical printer settings. Enforces Admin role.

```typescript
export async function savePrinterConfig(
  id: string | null, // null for new printer creation
  data: {
    name: string;
    description?: string;
    type: "THERMAL" | "STANDARD" | "PDF_OUTPUT";
    isDefault: boolean;
    isActive: boolean;
  }
): Promise<{ success: boolean; printerId?: string; error?: string }>;
```

---

### 2. Create Print Job
Pushes a new printable job to the queue. Enforces appropriate RBAC roles (Warehouse Staff or above).

```typescript
export async function createPrintJob(input: {
  targetType: "BATCH" | "CONTAINER" | "WAREHOUSE";
  targetId: string;
  templateId: string;
  printerId?: string;
  quantity: number;
}): Promise<{ success: boolean; jobId?: string; error?: string }>;
```
*   **Payload Construction**: Automatically fetches target entity details (e.g. batch details from database) and structures the `payload` JSON with localized properties and QR code tracking URLs.

---

### 3. Record Reprint
Records authorization and logs the reprint reasons. Enforces Supervisor or Admin role.

```typescript
export async function recordReprint(input: {
  printJobId: string;
  reason: "DAMAGE" | "LOSS" | "PRINT_ERROR" | "OTHER";
  customReason?: string;
}): Promise<{ success: boolean; error?: string }>;
```

---

### 4. Update Print Job Status
Updates the state of a queue item and logs outcomes to `print_history`.

```typescript
export async function updatePrintJobStatus(input: {
  jobId: string;
  status: "COMPLETED" | "FAILED";
  errorMessage?: string;
}): Promise<{ success: boolean; error?: string }>;
```

---

### 5. Get Print History
Queries the index-filtered print records table.

```typescript
export async function getPrintHistory(filters: {
  page?: number;
  pageSize?: number;
  search?: string; // Search on actorName, printerName, targetId
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  history: Array<{
    id: string;
    createdAt: Date;
    actorName: string;
    printerName: string;
    templateName: string;
    status: string;
    errorMessage: string | null;
    printJob: {
      targetType: string;
      targetId: string;
    };
  }>;
  totalPages: number;
  totalCount: number;
}>;
```

---

## Label Template Routes (Next.js App Router)

We provide clean, isolated HTML endpoints to display bare labels without layout wrappers (no app-level navbars or footers), designed for standard browser `window.print()` triggers.

### GET `/printing/label/[id]`
Renders a bare HTML viewport with custom `@media print` layout rules based on the template dimensions.
*   **Query Parameters**:
    *   `jobId` (string): The ID of the `PrintJob` queue item containing the payload data.
*   **Output**: HTML document with localized text and a render-safe canvas/SVG QR code.
