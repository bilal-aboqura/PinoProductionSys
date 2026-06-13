import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getNearExpiryBatches } from "@/features/batches/queries";

export async function ExpiryAlerts({ locale }: { locale: string }) {
  const batches = await getNearExpiryBatches().catch(() => []);
  if (batches.length === 0) {
    return (
      <section className="rounded-md border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-bold">Expiry Alerts</h2>
        <p className="mt-2 text-sm text-secondary">No active batches expire in the next 7 days.</p>
      </section>
    );
  }
  return (
    <section className="rounded-md border border-warning/40 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h2 className="text-lg font-bold">Expiry Alerts</h2>
      </div>
      <div className="mt-3 grid gap-2">
        {batches.map((batch) => (
          <Link key={batch.id} href={`/${locale}/inventory/batches/${batch.batchNumber}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 hover:bg-accent/20">
            <span className="font-semibold">{batch.batchNumber}</span>
            <span className="text-sm text-secondary">{batch.productName}</span>
            <Badge>{new Date(batch.expiryDate).toLocaleDateString()}</Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
