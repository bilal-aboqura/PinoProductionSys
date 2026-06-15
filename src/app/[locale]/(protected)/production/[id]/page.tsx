import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { CancelOrderDialog } from "@/components/production-orders/CancelOrderDialog";
import { CompleteOrderButton } from "@/components/production-orders/CompleteOrderButton";
import { DownstreamActionsPanel } from "@/components/production-orders/DownstreamActionsPanel";
import { OrderDetailHeader } from "@/components/production-orders/OrderDetailHeader";
import { StartProductionButton } from "@/components/production-orders/StartProductionButton";
import { StatusHistoryTimeline } from "@/components/production-orders/StatusHistoryTimeline";
import { StepExecutionCard } from "@/components/production-orders/StepExecutionCard";
import { getWarehouses } from "@/features/inventory/queries";
import { getProductionOrderDetail } from "@/features/production-orders/queries";

export default async function ProductionOrderDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  let order;
  try {
    order = await getProductionOrderDetail(id);
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  if (!order) notFound();
  const warehouses = await getWarehouses().catch(() => []);
  const firstIncomplete = order.steps.find((step) => !step.isCompleted)?.id;
  const allStepsComplete = order.steps.length > 0 && order.steps.every((step) => step.isCompleted);
  const canCancel = ["PENDING_UNASSIGNED", "PENDING", "IN_PROGRESS"].includes(order.status);

  return (
    <section className="logical-container space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-semibold text-primary" href={`/${locale}/production`}>
          Back to production
        </Link>
        {canCancel ? (
          <Link href={`/${locale}/production/${order.id}/cancel`}>
            <Button variant="danger">Cancel</Button>
          </Link>
        ) : null}
      </div>
      <OrderDetailHeader order={order} />
      {order.status === "PENDING" && order.canExecute ? <StartProductionButton orderId={order.id} version={order.version} /> : null}
      <div className="space-y-4">
        {order.steps.map((step) => (
          <StepExecutionCard key={step.id} order={order} step={step} locked={!step.isCompleted && step.id !== firstIncomplete} />
        ))}
        {order.steps.length === 0 ? <div className="rounded-md border bg-white p-8 text-center text-secondary">No steps are attached to this order.</div> : null}
      </div>
      {order.status === "IN_PROGRESS" && allStepsComplete ? (
        <CompleteOrderButton orderId={order.id} version={order.version} targetQuantity={order.targetQuantity} unit={order.yieldUnit} warehouses={warehouses} />
      ) : null}
      {order.status === "COMPLETED" ? <DownstreamActionsPanel orderId={order.id} actions={order.downstreamActions} /> : null}
      {order.status === "CANCELLED" ? (
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold">Cancellation</h2>
          <p className="mt-2 text-sm">{order.cancellationReason}</p>
        </div>
      ) : null}
      {canCancel ? <CancelOrderDialog orderId={order.id} version={order.version} /> : null}
      <StatusHistoryTimeline history={order.statusHistory} />
    </section>
  );
}
