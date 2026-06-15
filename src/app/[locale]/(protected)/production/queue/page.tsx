import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { ClaimOrderButton } from "@/components/production-orders/ClaimOrderButton";
import { getUnassignedQueue } from "@/features/production-orders/queries";

export default async function ProductionQueuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const orders = await getUnassignedQueue();
    return (
      <section className="logical-container space-y-6 py-8">
        <div>
          <Link className="text-sm font-semibold text-primary" href={`/${locale}/production`}>
            Back to production
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Unassigned Queue</h1>
        </div>
        <div className="grid gap-3">
          {orders.map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4 shadow-sm">
              <div>
                <p className="font-mono text-sm text-secondary">{order.orderNumber}</p>
                <h2 className="font-semibold">{order.recipeName}</h2>
                <p className="text-sm text-secondary">
                  {order.categoryName ?? "No category"} · {order.targetQuantity ? `${order.targetQuantity} ${order.yieldUnit}` : "No target"} ·{" "}
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <ClaimOrderButton orderId={order.id} version={order.version} />
            </div>
          ))}
          {orders.length === 0 ? <div className="rounded-md border bg-white p-8 text-center text-secondary">No unassigned orders.</div> : null}
        </div>
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
