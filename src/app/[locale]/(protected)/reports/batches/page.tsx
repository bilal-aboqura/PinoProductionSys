import { AccessDenied } from "@/components/shared/AccessDenied";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getBatchTimeline, getReportRows } from "@/features/reports/queries";
import type { ReportFilters } from "@/features/reports/types";
import { BatchTimeline } from "../_components/BatchTimeline";
import { ReportTable } from "../_components/ReportTable";

export default async function BatchReportsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const batch = stringParam(sp.batch);

  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");
    const filters = filtersFromSearch(sp);
    const [report, timeline, warehouses] = await Promise.all([
      getReportRows("ACTIVE_BATCHES", filters, 1, 50),
      batch ? getBatchTimeline(batch) : Promise.resolve(null)
      ,
      prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    ]);

    return (
      <section className="logical-container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Batch Traceability</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">Search active batch records and inspect chronological status, print, and disposal events.</p>
        </div>

        <form className="grid gap-3 rounded-md border bg-white p-4 shadow-sm lg:grid-cols-[1fr_150px_150px_180px_150px_auto]">
          <input className="h-10 rounded-md border px-3 text-sm" name="search" placeholder="Search batches" defaultValue={filters.search ?? ""} />
          <input className="h-10 rounded-md border px-3 text-sm" name="startDate" type="date" defaultValue={filters.startDate?.slice(0, 10) ?? ""} />
          <input className="h-10 rounded-md border px-3 text-sm" name="endDate" type="date" defaultValue={filters.endDate?.slice(0, 10) ?? ""} />
          <select className="h-10 rounded-md border bg-white px-3 text-sm" name="warehouseId" defaultValue={filters.warehouseId ?? ""}>
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
          <select className="h-10 rounded-md border bg-white px-3 text-sm" name="status" defaultValue={filters.status ?? "ACTIVE"}>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="DISPOSED">Disposed</option>
            <option value="CONSUMED">Consumed</option>
            <option value="">All status</option>
          </select>
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90" type="submit">
            Apply Filters
          </button>
        </form>

        <form className="mt-3 grid gap-3 rounded-md border bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]">
          <input className="h-10 rounded-md border px-3 text-sm" name="batch" placeholder="Batch number" defaultValue={batch ?? ""} />
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90" type="submit">
            Search Batch
          </button>
        </form>

        <div className="mt-6">
          <BatchTimeline timeline={timeline} />
        </div>
        <div className="mt-6">
          <ReportTable locale={locale} reportType="ACTIVE_BATCHES" rows={report.rows} columns={report.columns} totalCount={report.totalCount} page={report.page} totalPages={report.totalPages} filters={filters} />
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

function stringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function filtersFromSearch(searchParams: Record<string, string | string[] | undefined>): ReportFilters {
  const start = stringParam(searchParams.startDate);
  const end = stringParam(searchParams.endDate);
  return {
    search: stringParam(searchParams.search),
    warehouseId: stringParam(searchParams.warehouseId),
    status: stringParam(searchParams.status) ?? "ACTIVE",
    startDate: start ? new Date(`${start}T00:00:00.000Z`).toISOString() : undefined,
    endDate: end ? new Date(`${end}T23:59:59.999Z`).toISOString() : undefined
  };
}
