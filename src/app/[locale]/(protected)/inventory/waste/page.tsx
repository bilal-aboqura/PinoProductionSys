import { Button } from "@/components/ui/button";
import { recordInventoryWaste } from "@/features/inventory/actions";
import { getInventoryItems, getInventoryWasteHistory, getWarehouses } from "@/features/inventory/queries";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { WasteHistoryTable } from "./_components/WasteHistoryTable";

export default async function WastePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [items, warehouses, wasteRecords] = await Promise.all([getInventoryItems({ isActive: true }), getWarehouses(), getInventoryWasteHistory()]);

  async function submitWaste(formData: FormData) {
    "use server";
    await recordInventoryWaste({
      inventoryItemId: formData.get("inventoryItemId"),
      warehouseId: formData.get("warehouseId"),
      quantity: formData.get("quantity"),
      reason: formData.get("reason"),
      notes: formData.get("notes")
    });
  }

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current="Waste" />
      <div>
        <p className="text-sm font-semibold text-secondary">Waste Recording</p>
        <h1 className="text-3xl font-bold">Record Waste</h1>
      </div>
      <form action={submitWaste} className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-5">
        <select className="rounded-md border px-3 py-2 text-sm" name="inventoryItemId" required>
          <option value="">Item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>{item.code} - {item.nameEn}</option>
          ))}
        </select>
        <select className="rounded-md border px-3 py-2 text-sm" name="warehouseId" required>
          <option value="">Warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>
          ))}
        </select>
        <input className="rounded-md border px-3 py-2 text-sm" name="quantity" placeholder="Quantity" type="number" step="0.001" min="0.001" required />
        <select className="rounded-md border px-3 py-2 text-sm" name="reason" required>
          <option value="SPOILAGE">Spoilage</option>
          <option value="BURNED_BATCH">Burned Batch</option>
          <option value="PRODUCTION_LOSS">Production Loss</option>
          <option value="DAMAGED_MATERIAL">Damaged Material</option>
        </select>
        <input className="rounded-md border px-3 py-2 text-sm" name="notes" placeholder="Notes" />
        <Button type="submit">Record Waste</Button>
      </form>
      <WasteHistoryTable wasteRecords={wasteRecords} />
    </section>
  );
}
