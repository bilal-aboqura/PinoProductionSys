import type { ProductionOrderStatus } from "@prisma/client";

const allowedTransitions: Record<ProductionOrderStatus, ProductionOrderStatus[]> = {
  PENDING_UNASSIGNED: ["PENDING", "CANCELLED"],
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: []
};

export function assertValidTransition(from: ProductionOrderStatus, to: ProductionOrderStatus) {
  if (!allowedTransitions[from]?.includes(to)) {
    throw new Error(`Invalid production order transition from ${from} to ${to}.`);
  }
}

export function canTransition(from: ProductionOrderStatus, to: ProductionOrderStatus) {
  return allowedTransitions[from]?.includes(to) ?? false;
}
