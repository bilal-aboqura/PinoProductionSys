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

export default async function ReportsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");
    const metrics = await getDashboardMetrics();
    const production = await getReportRows("PRODUCTION_SUMMARY", {}, 1, 8);

    return (
      <section className="logical-container py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">Operational visibility across production, inventory, batches, waste, warehouse movement, and staff activity.</p>
          </div>
          <Badge>Live analytics</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Production Today" value={metrics.productionToday} detail="Orders created today" icon={Activity} />
          <KpiCard title="In Progress" value={metrics.ordersInProgress} detail="Active production orders" icon={Clock} />
          <KpiCard title="Completed Today" value={metrics.ordersCompletedToday} detail="Finished orders" icon={PackageCheck} />
          <KpiCard title="Active Batches" value={metrics.activeBatches} detail="Traceable batch records" icon={Boxes} />
          <KpiCard title="Near Expiry" value={metrics.nearExpiryBatches} detail="Expiring within 7 days" icon={TimerReset} />
          <KpiCard title="Expired Batches" value={metrics.expiredBatches} detail="Active batches past expiry" icon={PackageX} />
          <KpiCard title="Low Stock" value={metrics.lowStockItems} detail="Balances under minimum" icon={AlertTriangle} />
          <KpiCard title="Waste Today" value={metrics.wasteToday} detail="Recorded waste quantity" icon={Trash2} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <TrendChart title="Production Trend" points={metrics.productionTrend} />
          <TrendChart title="Waste Trend" points={metrics.wasteTrend} />
        </div>

        <nav className="mt-6 flex flex-wrap gap-2">
          {[
            ["Production", "production"],
            ["Inventory", "inventory"],
            ["Batches", "batches"],
            ["Waste", "waste"],
            ["Warehouse", "warehouse"],
            ["Staff", "staff"],
            ["Scheduled", "scheduled"]
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
