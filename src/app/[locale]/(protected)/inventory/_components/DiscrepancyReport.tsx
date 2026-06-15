import type { BalanceDto } from "@/features/inventory/types";

export function DiscrepancyReport({ balances }: { balances: BalanceDto[] }) {
  const flagged = balances.filter((balance) => balance.needsReconciliation || balance.isNegativeStock);
  if (flagged.length === 0) return null;

  return (
    <section className="rounded-md border border-warning/40 bg-white p-4">
      <h2 className="text-lg font-bold">Reconciliation Needed</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {flagged.map((balance) => (
          <div key={balance.id} className="rounded-md border bg-warning/10 p-3 text-sm">
            <div className="font-semibold">{balance.itemCode} - {balance.nameEn}</div>
            <div className="text-muted">
              {balance.warehouseName}: {balance.currentQuantity} {balance.unit}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
