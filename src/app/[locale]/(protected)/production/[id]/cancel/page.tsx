import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { CancelOrderDialog } from "@/components/production-orders/CancelOrderDialog";
import { OrderDetailHeader } from "@/components/production-orders/OrderDetailHeader";
import { getProductionOrderDetail } from "@/features/production-orders/queries";

export default async function CancelProductionOrderPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  try {
    const order = await getProductionOrderDetail(id);
    if (!order) notFound();
    return (
      <section className="logical-container space-y-6 py-8">
        <Link className="text-sm font-semibold text-primary" href={`/${locale}/production/${id}`}>
          Back to order
        </Link>
        <OrderDetailHeader order={order} />
        <CancelOrderDialog orderId={order.id} version={order.version} />
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
