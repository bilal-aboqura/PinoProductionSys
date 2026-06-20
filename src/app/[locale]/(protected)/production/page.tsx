import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Pagination } from "@/components/shared/Pagination";
import { Button } from "@/components/ui/button";
import { OrderListTable } from "@/components/production-orders/OrderListTable";
import { PrintPageButton } from "@/features/printing/components/PrintPageButton";
import { getProductionOrderList } from "@/features/production-orders/queries";
import { parsePage } from "@/lib/pagination";
import type { ProductionOrderStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

const statuses: ProductionOrderStatus[] = ["PENDING_UNASSIGNED", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default async function ProductionPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "workspace" });
  const query = await searchParams;
  const status = statuses.includes(query.status as ProductionOrderStatus) ? (query.status as ProductionOrderStatus) : undefined;
  let result;
  try {
    result = await getProductionOrderList({ search: query.search, status }, { page: parsePage(query.page), pageSize: 50 });
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
          <p className="text-sm font-semibold text-secondary">{t("production")}</p>
          <h1 className="text-3xl font-bold">{t("productionOrders")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintPageButton label={t("printSummary")} />
          <Link href={`/${locale}/production/queue`}>
            <Button variant="secondary">{t("queue")}</Button>
          </Link>
          <Link href={`/${locale}/production/new`}>
            <Button>{t("newOrder")}</Button>
          </Link>
        </div>
      </div>
      <OrderListTable orders={result.items} locale={locale} defaultFilters={query} />
      <div className="mt-4">
        <Pagination
          pathname={`/${locale}/production`}
          page={result.page}
          totalPages={result.totalPages}
          totalItems={result.total}
          searchParams={query}
          itemLabel={t("productionOrders").toLocaleLowerCase(locale)}
        />
      </div>
    </section>
  );
}
