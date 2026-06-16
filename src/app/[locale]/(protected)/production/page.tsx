import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { OrderListTable } from "@/components/production-orders/OrderListTable";
import { PrintPageButton } from "@/features/printing/components/PrintPageButton";
import { getProductionOrderList } from "@/features/production-orders/queries";

export default async function ProductionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  let orders = [];
  try {
    const result = await getProductionOrderList({}, { pageSize: 50 });
    orders = result.items;
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  return (
    <section className="logical-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">Production</p>
          <h1 className="text-3xl font-bold">Production Orders</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintPageButton label="Print Summary" />
          <Link href={`/${locale}/production/queue`}>
            <Button variant="secondary">Queue</Button>
          </Link>
          <Link href={`/${locale}/production/new`}>
            <Button>New Order</Button>
          </Link>
        </div>
      </div>
      <OrderListTable orders={orders} locale={locale} />
    </section>
  );
}
