import Link from "next/link";
import { Activity, AlertTriangle, Boxes, Clock, PackageCheck, PackageX, TimerReset, Trash2 } from "lucide-react";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { getDashboardMetrics, getReportRows } from "@/features/reports/queries";
import { KpiCard } from "./_components/KpiCard";
import { ReportTable } from "./_components/ReportTable";
import { TrendChart } from "./_components/TrendChart";
import { getTranslations } from "next-intl/server";

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "workspace" });
  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");
    const metrics = await getDashboardMetrics();
    const production = await getReportRows("PRODUCTION_SUMMARY", {}, 1, 8);

    return (
      <section className="logical-container py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("reports")}</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">{t("reportsDescription")}</p>
          </div>
          <Badge>{t("liveAnalytics")}</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t("productionToday")} value={metrics.productionToday} detail={t("ordersCreatedToday")} icon={Activity} />
          <KpiCard title={t("inProgress")} value={metrics.ordersInProgress} detail={t("activeProductionOrders")} icon={Clock} />
          <KpiCard title={t("completedToday")} value={metrics.ordersCompletedToday} detail={t("finishedOrders")} icon={PackageCheck} />
          <KpiCard title={t("activeBatches")} value={metrics.activeBatches} detail={t("traceableBatchRecords")} icon={Boxes} />
          <KpiCard title={t("nearExpiry")} value={metrics.nearExpiryBatches} detail={t("expiringWithinSevenDays")} icon={TimerReset} />
          <KpiCard title={t("expiredBatches")} value={metrics.expiredBatches} detail={t("activeBatchesPastExpiry")} icon={PackageX} />
          <KpiCard title={t("lowStock")} value={metrics.lowStockItems} detail={t("balancesUnderMinimum")} icon={AlertTriangle} />
          <KpiCard title={t("wasteToday")} value={metrics.wasteToday} detail={t("recordedWasteQuantity")} icon={Trash2} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TrendChart title={t("productionTrend")} points={metrics.productionTrend} />
          <TrendChart title={t("wasteTrend")} points={metrics.wasteTrend} />
        </div>

        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            [t("production"), "production"],
            [t("inventory"), "inventory"],
            [t("batches"), "batches"],
            [t("waste"), "waste"],
            [t("warehouse"), "warehouse"],
            [t("staff"), "staff"],
            [t("scheduled"), "scheduled"],
            ["Recipe costing", "recipes"]
          ].map(([label, href]) => (
            <Link key={href} className="rounded-md border bg-white px-3 py-2 text-sm font-semibold text-secondary hover:bg-accent/35" href={`/${locale}/reports/${href}`}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          <ReportTable locale={locale} reportType="PRODUCTION_SUMMARY" rows={production.rows} columns={production.columns} totalCount={production.totalCount} page={production.page} totalPages={production.totalPages} showPagination={false} />
        </div>
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "PERMISSION_DENIED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
