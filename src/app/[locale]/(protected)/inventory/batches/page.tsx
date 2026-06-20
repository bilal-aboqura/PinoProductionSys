import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Pagination } from "@/components/shared/Pagination";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Badge } from "@/components/ui/badge";
import { getWarehouses } from "@/features/inventory/queries";
import { batchStatusOptions, getBatchList } from "@/features/batches/queries";
import { parsePage } from "@/lib/pagination";
import { ExpiryAlerts } from "./_components/ExpiryAlerts";
import { getTranslations } from "next-intl/server";

export default async function BatchesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; status?: string; warehouseId?: string; sort?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "workspace" });
  const query = await searchParams;
  let batches;
  try {
    batches = await getBatchList({
      search: query.search,
      status: batchStatusOptions().includes(query.status as never) ? (query.status as never) : undefined,
      warehouseId: query.warehouseId,
      sort: ["newest", "expiry", "status", "batchNumber"].includes(query.sort ?? "") ? (query.sort as never) : undefined,
      page: parsePage(query.page),
      pageSize: 25
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
  const warehouses = await getWarehouses().catch(() => []);

  return (
    <section className="logical-container space-y-6 py-8">
      <div>
        <Link className="text-sm font-semibold text-primary" href={`/${locale}/inventory`}>
          {t("backToInventory")}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-normal">{t("batches")}</h1>
            <p className="mt-1 text-sm text-secondary">{t("batchesDescription")}</p>
          </div>
        </div>
      </div>

      <ExpiryAlerts locale={locale} />

      <form className="grid gap-3 rounded-md border bg-white p-4 shadow-sm md:grid-cols-[1fr_auto_auto_auto]">
        <SearchCombobox name="search" source="batches" placeholder="Select batch, product, or code" defaultValue={query.search} />
        <select className="h-10 rounded-md border px-3 text-sm" name="status" defaultValue={query.status ?? ""}>
          <option value="">All statuses</option>
          {batchStatusOptions().map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border px-3 text-sm" name="warehouseId" defaultValue={query.warehouseId ?? ""}>
          <option value="">All warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.code} - {warehouse.name}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border px-3 text-sm" name="sort" defaultValue={query.sort ?? "newest"}>
          <option value="newest">Newest</option>
          <option value="expiry">Expiry</option>
          <option value="status">Status</option>
          <option value="batchNumber">Batch number</option>
        </select>
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white md:col-start-4">Filter</button>
      </form>

      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-accent/35 text-secondary">
            <tr>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Expiry</th>
            </tr>
          </thead>
          <tbody>
            {batches.items.map((batch) => (
              <tr key={batch.id} className="border-t">
                <td className="px-4 py-3">
                  <Link className="font-bold text-primary" href={`/${locale}/inventory/batches/${batch.batchNumber}`}>
                    {batch.batchNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">{batch.productName}</td>
                <td className="px-4 py-3">
                  <Badge>{batch.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {batch.remainingQuantity} {batch.unit}
                </td>
                <td className="px-4 py-3">{batch.warehouseName}</td>
                <td className="px-4 py-3">{new Date(batch.expiryDate).toLocaleDateString()}</td>
              </tr>
            ))}
            {batches.items.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-secondary" colSpan={6}>
                  No batches match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pagination
        pathname={`/${locale}/inventory/batches`}
        page={batches.page}
        totalPages={batches.totalPages}
        totalItems={batches.total}
        searchParams={query}
        itemLabel={t("batches").toLocaleLowerCase(locale)}
      />
    </section>
  );
}
