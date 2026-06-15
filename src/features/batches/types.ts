import type { BatchStatus, DisposalReason, LabelTemplate } from "@prisma/client";

export type BatchErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "INTERNAL";

export type BatchActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: { code: BatchErrorCode; message: string; details?: unknown } };

export type CreateBatchInput = {
  productionOrderId: string;
  warehouseId: string;
  containerQuantities?: number[];
};

export type PrintLabelInput = {
  batchId: string;
  containerId?: string;
  template: LabelTemplate;
  isReprint: boolean;
  reprintReason?: string;
};

export type LabelData = {
  productName: string;
  batchNumber: string;
  containerNumber?: string;
  productionDate: string;
  expiryDate: string;
  quantity: number;
  unit: string;
  qrCodeData: string;
  storageInstructions?: string | null;
  productCode?: string | null;
  warehouseName?: string | null;
};

export type BatchListFilters = {
  search?: string;
  status?: BatchStatus;
  warehouseId?: string;
  sort?: "newest" | "expiry" | "status" | "batchNumber";
  page?: number;
  pageSize?: number;
};

export type BatchListItem = {
  id: string;
  batchNumber: string;
  productName: string;
  status: BatchStatus;
  productionDate: string;
  expiryDate: string;
  producedQuantity: string;
  remainingQuantity: string;
  unit: string;
  warehouseName: string;
};

export type BatchTraceability = BatchListItem & {
  recipeDetails?: {
    name: string;
    code: string;
    version: number;
    storageInstructions?: string | null;
  };
  containers: {
    id: string;
    containerNumber: string;
    quantity: string;
    remainingQuantity: string;
    status: BatchStatus;
  }[];
  statusHistory: {
    id: string;
    fromStatus: BatchStatus | null;
    toStatus: BatchStatus;
    changedByName: string;
    reason: string | null;
    changedAt: string;
  }[];
  printHistory?: {
    id: string;
    labelTemplate: LabelTemplate;
    printedByName: string;
    printedAt: string;
    isReprint: boolean;
    reprintReason: string | null;
  }[];
  disposals?: {
    id: string;
    quantityDisposed: string;
    reason: DisposalReason;
    notes: string | null;
    disposedByName: string;
    disposedAt: string;
  }[];
  evidence?: {
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    uploadedAt: string;
  }[];
};

export type PagedBatches = {
  items: BatchListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
