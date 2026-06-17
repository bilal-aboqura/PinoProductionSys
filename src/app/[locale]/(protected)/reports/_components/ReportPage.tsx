import { AccessDenied } from "@/components/shared/AccessDenied";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { parsePage } from "@/lib/pagination";
import { getReportRows } from "@/features/reports/queries";
import type { ReportFilters, ReportType } from "@/features/reports/types";
import { ReportTable } from "./ReportTable";

export async function ReportPage({
  locale,
  reportType,
  title,
  description,
  searchParams
}: {
  locale: string;
  reportType: ReportType;
  title: string;
  description: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  try {
    const session = await getServerSession();
    requirePermission(session, "reports:view");
    const filters = filtersFromSearch(searchParams);
    const report = await getReportRows(reportType, filters, parsePage(searchParams?.page), 50);

    return (
      <section className="logical-container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p>
        </div>
        <ReportFiltersForm filters={filters} />
        <div className="mt-6">
          <ReportTable locale={locale} reportType={reportType} rows={report.rows} columns={report.columns} totalCount={report.totalCount} page={report.page} totalPages={report.totalPages} filters={filters} />
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

function ReportFiltersForm({ filters }: { filters: ReportFilters }) {
  return (
    <form className="grid gap-3 rounded-md border bg-white p-4 shadow-sm md:grid-cols-4">
      <input className="h-10 rounded-md border px-3 text-sm" name="search" placeholder="Search" defaultValue={filters.search ?? ""} />
      <input className="h-10 rounded-md border px-3 text-sm" name="startDate" type="date" defaultValue={filters.startDate?.slice(0, 10) ?? ""} />
      <input className="h-10 rounded-md border px-3 text-sm" name="endDate" type="date" defaultValue={filters.endDate?.slice(0, 10) ?? ""} />
      <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90" type="submit">
        Apply Filters
      </button>
    </form>
  );
}

function filtersFromSearch(searchParams?: Record<string, string | string[] | undefined>): ReportFilters {
  const start = stringParam(searchParams?.startDate);
  const end = stringParam(searchParams?.endDate);
  return {
    search: stringParam(searchParams?.search),
    status: stringParam(searchParams?.status),
    userId: stringParam(searchParams?.userId),
    warehouseId: stringParam(searchParams?.warehouseId),
    startDate: start ? new Date(`${start}T00:00:00.000Z`).toISOString() : undefined,
    endDate: end ? new Date(`${end}T23:59:59.999Z`).toISOString() : undefined
  };
}

function stringParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}
