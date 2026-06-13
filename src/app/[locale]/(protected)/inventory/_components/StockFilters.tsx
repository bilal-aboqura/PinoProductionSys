import type { WarehouseDto } from "@/features/inventory/types";

export function StockFilters({ warehouses, defaultValues = {} }: { warehouses: WarehouseDto[]; defaultValues?: Record<string, string | undefined> }) {
  return (
    <form className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-5">
      <input
        className="rounded-md border px-3 py-2 text-sm md:col-span-2"
        name="search"
        defaultValue={defaultValues.search}
        placeholder="Search code or name"
      />
      <select className="rounded-md border px-3 py-2 text-sm" name="warehouseId" defaultValue={defaultValues.warehouseId ?? ""}>
        <option value="">All warehouses</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name}
          </option>
        ))}
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" name="itemType" defaultValue={defaultValues.itemType ?? ""}>
        <option value="">All item types</option>
        <option value="RAW_MATERIAL">Raw Material</option>
        <option value="FINISHED_PRODUCT">Finished Product</option>
      </select>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="lowStockOnly" value="1" defaultChecked={defaultValues.lowStockOnly === "1"} />
          Low stock
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="needsReconciliationOnly" value="1" defaultChecked={defaultValues.needsReconciliationOnly === "1"} />
          Reconcile
        </label>
        <button className="rounded-md bg-primary px-3 py-2 font-semibold text-white" type="submit">
          Apply
        </button>
      </div>
    </form>
  );
}
