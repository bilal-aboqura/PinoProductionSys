import { getInventoryBalanceOptions, getInventoryItems, getInventoryTransferHistory, getUserWarehouseAssignments, getWarehouses } from "@/features/inventory/queries";
import { getServerSession } from "@/lib/auth";
import { InventoryBreadcrumb } from "../_components/InventoryBreadcrumb";
import { TransferForm } from "./_components/TransferForm";
import { TransferHistoryTable } from "./_components/TransferHistoryTable";

export default async function TransfersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [items, warehouses, transfers, balances, session] = await Promise.all([
    getInventoryItems({ isActive: true }),
    getWarehouses(),
    getInventoryTransferHistory(),
    getInventoryBalanceOptions(),
    getServerSession()
  ]);
  const unrestricted = session.user.permissions.includes("inventory:manage") || session.user.permissions.includes("inventory:approve");
  const sourceWarehouses = unrestricted ? warehouses : await getUserWarehouseAssignments(session.user.id);

  return (
    <section className="logical-container space-y-6 py-8">
      <InventoryBreadcrumb locale={locale} current="Transfers" />
      <div>
        <p className="text-sm font-semibold text-secondary">Warehouse Transfers</p>
        <h1 className="text-3xl font-bold">Transfer Stock</h1>
      </div>
      <TransferForm items={items} sourceWarehouses={sourceWarehouses} destinationWarehouses={warehouses} balances={balances} />
      <TransferHistoryTable transfers={transfers} />
    </section>
  );
}
