import type { ProductionOrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const labels: Record<ProductionOrderStatus, string> = {
  PENDING_UNASSIGNED: "Pending unassigned",
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const classes: Record<ProductionOrderStatus, string> = {
  PENDING_UNASSIGNED: "bg-accent text-secondary",
  PENDING: "bg-warning/20 text-secondary",
  IN_PROGRESS: "bg-primary/15 text-primary",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-error/15 text-error"
};

export function OrderStatusBadge({ status }: { status: ProductionOrderStatus }) {
  return <Badge className={classes[status]}>{labels[status]}</Badge>;
}
