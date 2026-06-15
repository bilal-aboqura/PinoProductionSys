import { getInventoryAdjustmentHistory, getInventoryBalanceOptions, getInventoryItems, getWarehouses } from "@/features/inventory/queries";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { AdjustmentForm } from "./_components/AdjustmentForm";
import { AdjustmentHistoryTable } from "./_components/AdjustmentHistoryTable";

export default async function AdjustmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [items, warehouses, adjustments, balances] = await Promise.all([
    getInventoryItems({ isActive: true }),
    getWarehouses(),
    getInventoryAdjustmentHistory(),
    getInventoryBalanceOptions()
  ]);

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current="Adjustments" />
      <div>
        <p className="text-sm font-semibold text-secondary">Manual Adjustments</p>
        <h1 className="text-3xl font-bold">Adjust Stock</h1>
      </div>
      <AdjustmentForm items={items} warehouses={warehouses} balances={balances} />
      <AdjustmentHistoryTable adjustments={adjustments} />
    </section>
  );
}
