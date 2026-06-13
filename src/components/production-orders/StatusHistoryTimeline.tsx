import type { ProductionOrderStatusHistoryDto } from "@/features/production-orders/types";

export function StatusHistoryTimeline({ history }: { history: ProductionOrderStatusHistoryDto[] }) {
  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Status History</h2>
      <ol className="mt-4 space-y-3">
        {history.map((item) => (
          <li key={item.id} className="border-l-2 border-accent pl-4">
            <p className="font-semibold">{item.fromStatus ?? "Created"} → {item.toStatus}</p>
            <p className="text-sm text-secondary">
              {item.changedByName ?? "Unknown"} · {new Date(item.changedAt).toLocaleString()}
            </p>
            {item.reason ? <p className="mt-1 text-sm">{item.reason}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
