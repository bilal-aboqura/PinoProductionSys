import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintPageButton } from "@/features/printing/components/PrintPageButton";
import { getInventoryBalances, getWarehouses } from "@/features/inventory/queries";
import { DiscrepancyReport } from "./_components/DiscrepancyReport";
import { StockFilters } from "./_components/StockFilters";
import { StockLevelsTable } from "./_components/StockLevelsTable";

export default async function InventoryPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  try {
    const warehouses = await getWarehouses();
    const balances = await getInventoryBalances({
      warehouseId: filters.warehouseId || undefined,
      search: filters.search || undefined,
      itemType: filters.itemType === "RAW_MATERIAL" || filters.itemType === "FINISHED_PRODUCT" ? filters.itemType : undefined,
      lowStockOnly: filters.lowStockOnly === "1",
      needsReconciliationOnly: filters.needsReconciliationOnly === "1",
      pageSize: 50
    });
    const lowStockItems = balances.items.filter((item) => item.isLowStock);
    const lowStock = lowStockItems.length;
    const negative = balances.items.filter((item) => item.isNegativeStock).length;

    return (
      <section className="logical-container space-y-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-secondary">Inventory</p>
            <h1 className="text-3xl font-bold">Stock Levels</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintPageButton label="Print Summary" />
            <Link href={`/${locale}/inventory/items`}>
              <Button variant="secondary">Catalog</Button>
            </Link>
            <Link href={`/${locale}/inventory/transfers`}>
              <Button variant="secondary">Transfers</Button>
            </Link>
            <Link href={`/${locale}/inventory/adjustments`}>
              <Button>Adjust Stock</Button>
            </Link>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tracked Balances</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">{balances.total}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Low Stock</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-warning">{lowStock}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Negative Stock</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-error">{negative}</CardContent>
          </Card>
        </div>
        <StockFilters warehouses={warehouses} defaultValues={filters} />
        {lowStockItems.length > 0 ? (
          <details className="rounded-md border border-warning/40 bg-white p-4">
            <summary className="cursor-pointer text-lg font-bold">
              Low-stock alerts <span className="rounded-sm bg-warning/15 px-2 py-1 text-sm text-secondary">{lowStockItems.length}</span>
            </summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {lowStockItems.map((item) => (
                <div key={item.id} className="rounded-md border bg-warning/10 p-3 text-sm">
                  <div className="font-semibold">{item.itemCode} - {item.nameEn}</div>
                  <div className="text-muted">
                    {item.warehouseName}: {item.currentQuantity} {item.unit} below minimum {item.minStockLevel}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : null}
        <DiscrepancyReport balances={balances.items} />
        <StockLevelsTable balances={balances.items} search={filters.search} />
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
