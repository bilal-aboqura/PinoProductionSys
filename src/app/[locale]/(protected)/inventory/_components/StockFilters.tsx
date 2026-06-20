import type { WarehouseDto } from "@/features/inventory/types";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { useTranslations } from "next-intl";

export function StockFilters({ warehouses, defaultValues = {} }: { warehouses: WarehouseDto[]; defaultValues?: Record<string, string | undefined> }) {
  const t = useTranslations("workspace");
  return (
    <form className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-5">
      <SearchCombobox className="md:col-span-2" name="search" source="inventory-items" defaultValue={defaultValues.search} placeholder={t("selectItem")} />
      <select className="rounded-md border px-3 py-2 text-sm" name="warehouseId" defaultValue={defaultValues.warehouseId ?? ""}>
        <option value="">{t("allWarehouses")}</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name}
          </option>
        ))}
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" name="itemType" defaultValue={defaultValues.itemType ?? ""}>
        <option value="">{t("allItemTypes")}</option>
        <option value="RAW_MATERIAL">{t("rawMaterial")}</option>
        <option value="FINISHED_PRODUCT">{t("finishedProduct")}</option>
      </select>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="lowStockOnly" value="1" defaultChecked={defaultValues.lowStockOnly === "1"} />
          {t("lowStock")}
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="needsReconciliationOnly" value="1" defaultChecked={defaultValues.needsReconciliationOnly === "1"} />
          {t("reconcile")}
        </label>
        <button className="rounded-md bg-primary px-3 py-2 font-semibold text-white" type="submit">
          {t("apply")}
        </button>
      </div>
    </form>
  );
}
