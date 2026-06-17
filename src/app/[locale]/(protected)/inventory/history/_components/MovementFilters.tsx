import type { WarehouseDto } from "@/features/inventory/types";

export function MovementFilters({
  warehouses,
  defaultValues = {}
}: {
  warehouses: WarehouseDto[];
  defaultValues?: Record<string, string | undefined>;
}) {
  return (
    <form className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-5">
      <input
        className="rounded-md border px-3 py-2 text-sm"
        name="itemSearch"
        placeholder="Search item"
        defaultValue={defaultValues.itemSearch}
      />
      <select className="rounded-md border px-3 py-2 text-sm" name="warehouseId" defaultValue={defaultValues.warehouseId ?? ""}>
        <option value="">All warehouses</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>
        ))}
      </select>
      <fieldset className="rounded-md border px-3 py-2 text-xs md:col-span-2">
        <legend className="px-1 text-sm font-semibold text-secondary">Movement types</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {["PURCHASE", "PRODUCTION_CONSUMPTION", "PRODUCTION_OUTPUT", "TRANSFER_OUT", "TRANSFER_IN", "ADJUSTMENT_INCREASE", "ADJUSTMENT_DECREASE", "WASTE", "RETURN"].map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input type="checkbox" name="movementTypes" value={type} defaultChecked={(defaultValues.movementTypes ?? "").split(",").includes(type)} />
              {type}
            </label>
          ))}
        </div>
      </fieldset>
      <input className="rounded-md border px-3 py-2 text-sm" name="dateFrom" type="date" defaultValue={defaultValues.dateFrom} />
      <input className="rounded-md border px-3 py-2 text-sm" name="dateTo" type="date" defaultValue={defaultValues.dateTo} />
      <button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white" type="submit">
        Filter
      </button>
    </form>
  );
}
