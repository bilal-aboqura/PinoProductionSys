import type { ProductionOrderDownstreamActionType, ProductionOrderStatus } from "@prisma/client";

export type ProductionOrderListItemDto = {
  id: string;
  orderNumber: string;
  status: ProductionOrderStatus;
  version: number;
  recipeName: string;
  yieldUnit: string;
  targetQuantity: string | null;
  producedQuantity: string | null;
  assignedToName: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type ProductionOrderStepPhotoDto = {
  id: string;
  storagePath: string;
  url?: string;
  mimeType: string;
  uploadedById: string;
  uploadedAt: string;
};

export type ProductionOrderStepNoteDto = {
  id: string;
  content: string;
  addedById: string;
  addedByName: string | null;
  addedAt: string;
};

export type ProductionOrderStepDto = {
  id: string;
  stepNumber: number;
  title: string;
  instructions: string;
  estimatedMinutes: number | null;
  requiresPhoto: boolean;
  requiresNotes: boolean;
  requiresQuantity: boolean;
  isCompleted: boolean;
  completedById: string | null;
  startedAt: string | null;
  completedAt: string | null;
  confirmedQuantity: string | null;
  confirmedUnit: string | null;
  photos: ProductionOrderStepPhotoDto[];
  notes: ProductionOrderStepNoteDto[];
};

export type ProductionOrderStatusHistoryDto = {
  id: string;
  fromStatus: ProductionOrderStatus | null;
  toStatus: ProductionOrderStatus;
  changedById: string;
  changedByName: string | null;
  reason: string | null;
  changedAt: string;
};

export type ProductionOrderDownstreamActionDto = {
  id: string;
  actionType: ProductionOrderDownstreamActionType;
  referenceId: string | null;
  triggeredById: string;
  triggeredByName: string | null;
  triggeredAt: string;
};

export type ProductionOrderDetailDto = ProductionOrderListItemDto & {
  recipeId: string;
  recipeVersionId: string;
  creationNotes: string | null;
  sourceWarehouseId: string | null;
  sourceWarehouseName: string | null;
  createdById: string;
  createdByName: string | null;
  assignedToId: string | null;
  claimedById: string | null;
  completedById: string | null;
  cancelledById: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  durationSeconds: number | null;
  canExecute: boolean;
  canCancel: boolean;
  canViewAll: boolean;
  steps: ProductionOrderStepDto[];
  statusHistory: ProductionOrderStatusHistoryDto[];
  downstreamActions: ProductionOrderDownstreamActionDto[];
};

export type OrderQueueItemDto = {
  id: string;
  orderNumber: string;
  version: number;
  recipeName: string;
  categoryName: string | null;
  targetQuantity: string | null;
  yieldUnit: string;
  createdAt: string;
};

export type CreatableRecipeVersionDto = {
  id: string;
  recipeId: string;
  recipeName: string;
  categoryId: string | null;
  categoryName: string | null;
  yieldQuantity: string;
  yieldUnit: string;
  versionNumber: number;
};

export type AssignableStaffDto = {
  id: string;
  displayName: string;
  email: string | null;
};

export type ProductionOrderSortKey = "createdAt" | "startedAt" | "completedAt" | "status";
