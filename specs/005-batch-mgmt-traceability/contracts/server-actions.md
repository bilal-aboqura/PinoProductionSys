# Server Actions: Batch Management & Traceability

This contract file outlines the Next.js Server Actions exposed for managing batches, printing labels, tracking disposals, and querying traceability records.

---

## 1. `createBatchFromOrder`
Generates a new production batch when a production order is marked as completed.

* **Invocation Trigger**: Automatic during the completion sequence of a `ProductionOrder`.
* **Authorization**: Role must be `Production Staff`, `Supervisor`, or `Admin`.
* **Input Parameters**:
  ```typescript
  interface CreateBatchInput {
    productionOrderId: string;
    warehouseId: string; // Target storage warehouse
    containerQuantities?: number[]; // If splitting into containers
  }
  ```
* **Validation Rules**:
  * `productionOrderId` must exist and correspond to an order in `IN_PROGRESS` state.
  * `warehouseId` must exist and be an active warehouse.
  * Sum of `containerQuantities` (if provided) must exactly match the total `producedQuantity` logged in the parent production order.
* **Return Value**:
  ```typescript
  interface CreateBatchResponse {
    success: boolean;
    batchId?: string;
    batchNumber?: string;
    error?: string;
  }
  ```

---

## 2. `printBatchLabelAction`
Compiles and logs the layout data for printing a batch or container label.

* **Authorization**: Role must be `Warehouse Staff`, `Supervisor`, or `Admin`.
* **Input Parameters**:
  ```typescript
  interface PrintLabelInput {
    batchId: string;
    containerId?: string; // Optional (if printing for specific container)
    template: "SMALL" | "STANDARD" | "LARGE";
    isReprint: boolean;
    reprintReason?: string; // Mandatory if isReprint is true
  }
  ```
* **Validation Rules**:
  * `batchId` must exist.
  * If `containerId` is provided, it must belong to the specified `batchId`.
  * If `isReprint` is true, `reprintReason` must be present and contain at least 5 characters.
* **Return Value**:
  ```typescript
  interface PrintLabelResponse {
    success: boolean;
    labelData?: {
      productName: string;
      batchNumber: string;
      productionDate: string; // ISO 8601
      expiryDate: string; // ISO 8601
      quantity: number;
      unit: string;
      qrCodeData: string; // Base64 PNG Data URL
      storageInstructions?: string;
      productCode?: string;
      warehouseName?: string;
    };
    error?: string;
  }
  ```

---

## 3. `disposeBatchAction`
Records a batch or container disposal and executes inventory deductions.

* **Authorization**: Role must be `Supervisor` or `Admin`.
* **Input Parameters**:
  ```typescript
  interface DisposeBatchInput {
    batchId: string;
    containerId?: string; // Optional (dispose specific container)
    quantity: number;
    reason: "EXPIRED" | "DAMAGED_GOODS" | "QUALITY_ISSUE";
    notes?: string;
  }
  ```
* **Validation Rules**:
  * `batchId` must exist and status must not be `CONSUMED` or `DISPOSED`.
  * `quantity` must be > 0.
  * `quantity` must not exceed the current available quantity in the batch or container.
* **Return Value**:
  ```typescript
  interface DisposeBatchResponse {
    success: boolean;
    disposalId?: string;
    newStatus?: string; // e.g., DISPOSED if remaining quantity is 0
    error?: string;
  }
  ```

---

## 4. `updateBatchStatusAction`
Updates the lifecycle status of a batch (e.g. marking it as `CONSUMED`).

* **Authorization**: Role must be `Warehouse Staff`, `Supervisor`, or `Admin`.
* **Input Parameters**:
  ```typescript
  interface UpdateBatchStatusInput {
    batchId: string;
    status: "ACTIVE" | "CONSUMED" | "EXPIRED" | "DISPOSED";
    reason?: string;
  }
  ```
* **Validation Rules**:
  * `batchId` must exist.
  * Irreversible states: Status cannot be changed if the current status is `DISPOSED`.
* **Return Value**:
  ```typescript
  interface UpdateBatchStatusResponse {
    success: boolean;
    error?: string;
  }
  ```

---

## 5. `getBatchTraceabilityAction`
Queries the complete lineage and history of a batch.

* **Authorization**: Fully gated. Requires active session. Information returned is restricted by user roles:
  * `Production Staff`: Can view assigned batch info.
  * `Warehouse Staff`: Can view batch details and storage info.
  * `Supervisor` & `Admin`: Can view full details, including staff names, recipes, audit trails, and evidence.
* **Input Parameters**:
  ```typescript
  interface GetTraceabilityInput {
    batchNumber: string; // e.g. B-YYYY-NNNNN
  }
  ```
* **Return Value**:
  ```typescript
  interface GetTraceabilityResponse {
    success: boolean;
    data?: {
      batchId: string;
      batchNumber: string;
      productName: string;
      productionDate: string;
      expiryDate: string;
      status: string;
      quantity: number;
      unit: string;
      warehouseName: string;
      
      // Role-gated fields (Supervisor/Admin only)
      recipeDetails?: {
        name: string;
        code: string;
        version: number;
        storageInstructions?: string;
      };
      productionStaff?: {
        id: string;
        displayName: string;
      }[];
      productionEvidence?: {
        fileName: string;
        fileUrl: string;
        uploadedAt: string;
      }[];
      inventoryMovements?: {
        timestamp: string;
        type: string;
        quantityDelta: number;
        user: string;
      }[];
    };
    error?: string;
  }
  ```
