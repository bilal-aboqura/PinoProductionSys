import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getInventoryItems, getInventoryMovementHistory, getWarehouses } from "@/features/inventory/queries";
import { EmptyState } from "../_components/EmptyState";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { MovementFilters } from "./_components/MovementFilters";
import { SourceLink } from "./_components/SourceLink";

export default async function InventoryHistoryPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const rawMovementTypes = Array.isArray(filters.movementTypes)
    ? filters.movementTypes
    : typeof filters.movementTypes === "string"
      ? filters.movementTypes.split(",")
      : [];
  const validTypes = [
    "PURCHASE",
    "PRODUCTION_CONSUMPTION",
    "PRODUCTION_OUTPUT",
    "TRANSFER_OUT",
    "TRANSFER_IN",
    "ADJUSTMENT_INCREASE",
    "ADJUSTMENT_DECREASE",
    "WASTE",
    "RETURN"
  ];
  const movementTypes = rawMovementTypes.filter((type) => validTypes.includes(type));
  const normalizedFilters = Object.fromEntries(Object.entries(filters).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]));
  const [items, warehouses, movements] = await Promise.all([
    getInventoryItems({ isActive: true }),
    getWarehouses(),
    getInventoryMovementHistory({
      inventoryItemId: typeof filters.inventoryItemId === "string" && filters.inventoryItemId ? filters.inventoryItemId : undefined,
      itemSearch: typeof filters.itemSearch === "string" && filters.itemSearch ? filters.itemSearch : undefined,
      warehouseId: typeof filters.warehouseId === "string" && filters.warehouseId ? filters.warehouseId : undefined,
      movementTypes: movementTypes as never,
      dateFrom: typeof filters.dateFrom === "string" && filters.dateFrom ? filters.dateFrom : undefined,
      dateTo: typeof filters.dateTo === "string" && filters.dateTo ? filters.dateTo : undefined,
      pageSize: 50
    })
  ]);

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current="History" />
      <div>
        <p className="text-sm font-semibold text-secondary">Traceability Ledger</p>
        <h1 className="text-3xl font-bold">Inventory Movement History</h1>
      </div>
      <MovementFilters items={items} warehouses={warehouses} defaultValues={normalizedFilters} />
      {movements.items.length === 0 ? (
        <EmptyState title="No movements found" />
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Delta</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.items.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{new Date(movement.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{movement.userName}</TableCell>
                  <TableCell>{movement.itemCode} - {movement.itemName}</TableCell>
                  <TableCell>{movement.warehouseName}</TableCell>
                  <TableCell className="text-right">{movement.quantityDelta} {movement.unit}</TableCell>
                  <TableCell><Badge>{movement.movementType}</Badge></TableCell>
                  <TableCell><SourceLink movement={movement} locale={locale} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
