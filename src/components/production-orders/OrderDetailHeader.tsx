import type { ProductionOrderDetailDto } from "@/features/production-orders/types";
import { OrderStatusBadge } from "./OrderStatusBadge";

export function OrderDetailHeader({ order }: { order: ProductionOrderDetailDto }) {
  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-secondary">{order.orderNumber}</p>
          <h1 className="text-2xl font-bold">{order.recipeName}</h1>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-semibold text-secondary">Assigned</p>
          <p>{order.assignedToName ?? "Unassigned"}</p>
        </div>
        <div>
          <p className="font-semibold text-secondary">Target</p>
          <p>{order.targetQuantity ? `${order.targetQuantity} ${order.yieldUnit}` : "Not set"}</p>
        </div>
        <div>
          <p className="font-semibold text-secondary">Created</p>
          <p>{new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="font-semibold text-secondary">Started</p>
          <p>{order.startedAt ? new Date(order.startedAt).toLocaleString() : "Not started"}</p>
        </div>
      </div>
    </div>
  );
}
