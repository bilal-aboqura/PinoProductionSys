import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Pagination } from "@/components/shared/Pagination";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Badge } from "@/components/ui/badge";
import { getPrintHistory, getPrintQueue, canReprintLabels } from "@/features/printing/queries";
import { getServerSession } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { ReprintDialog } from "./components/ReprintDialog";

export default async function PrintingPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  try {
    const session = await getServerSession();
    const [queue, history] = await Promise.all([
      getPrintQueue(),
      getPrintHistory({ search: filters.search, status: filters.status, page: parsePage(filters.page), pageSize: 25 })
    ]);
    const canReprint = canReprintLabels(session.user.permissions);

    return (
      <section className="logical-container space-y-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-secondary">Printing</p>
            <h1 className="text-3xl font-bold">Queue & History</h1>
          </div>
          {session.user.permissions.includes("printing:manage_printers") || session.user.permissions.includes("system:configure") ? (
            <Link className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-white" href={`/${locale}/admin/printers`}>
              Printers
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {(["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const).map((status) => (
            <div key={status} className="rounded-md border bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase text-secondary">{status}</div>
              <div className="mt-2 text-3xl font-bold">{queue.filter((job) => job.status === status).length}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-background text-left text-xs uppercase text-secondary">
              <tr>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Printer</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((job) => (
                <tr key={job.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{job.payload.title}</div>
                    <div className="text-secondary">
                      {job.targetType} {job.targetId}
                    </div>
                  </td>
                  <td className="px-4 py-3">{job.printerName}</td>
                  <td className="px-4 py-3">
                    {job.templateName}
                    <div className="text-secondary">{job.templateDimensions}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{job.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{new Date(job.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <ReprintDialog jobId={job.id} locale={locale} canReprint={canReprint} />
                    </div>
                  </td>
                </tr>
              ))}
              {queue.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-secondary" colSpan={6}>
                    No print jobs yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">History</h2>
            <form className="flex gap-2">
              <SearchCombobox className="min-w-72" name="search" source="printing" defaultValue={filters.search} placeholder="Select target, printer, or actor" />
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">Search</button>
            </form>
          </div>
          <div className="grid gap-2">
            {history.history.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_160px_140px]">
                <div>
                  <div className="font-semibold">
                    {item.printJob.targetType} {item.printJob.targetId}
                  </div>
                  <div className="text-secondary">
                    {item.actorName} via {item.printerName} / {item.templateName}
                  </div>
                </div>
                <Badge>{item.status}</Badge>
                <div className="text-secondary">{new Date(item.createdAt).toLocaleString()}</div>
                {item.errorMessage ? <div className="md:col-span-3 text-error">{item.errorMessage}</div> : null}
              </div>
            ))}
            {history.history.length === 0 ? <p className="text-sm text-secondary">No print history matches the current filters.</p> : null}
          </div>
          <div className="mt-4">
            <Pagination
              pathname={`/${locale}/printing`}
              page={history.page}
              totalPages={history.totalPages}
              totalItems={history.totalCount}
              searchParams={filters}
              itemLabel="history entries"
            />
          </div>
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
