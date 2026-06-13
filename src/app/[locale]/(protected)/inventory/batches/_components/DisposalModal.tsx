"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disposeBatchAction } from "@/features/batches/actions";

export function DisposalModal({
  batchId,
  containers
}: {
  batchId: string;
  containers: { id: string; containerNumber: string }[];
}) {
  const [containerId, setContainerId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("QUALITY_ISSUE");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-error/30 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-error">Dispose Batch</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {containers.length ? (
          <div className="grid gap-1">
            <label className="text-sm font-semibold text-secondary">Container</label>
            <select className="h-10 rounded-md border px-3 text-sm" value={containerId} onChange={(event) => setContainerId(event.target.value)}>
              <option value="">Whole batch</option>
              {containers.map((container) => (
                <option key={container.id} value={container.id}>
                  {container.containerNumber}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Quantity</label>
          <input className="h-10 w-32 rounded-md border px-3 text-sm" min="0.001" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Reason</label>
          <select className="h-10 rounded-md border px-3 text-sm" value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="QUALITY_ISSUE">Quality issue</option>
            <option value="DAMAGED_GOODS">Damaged goods</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <input className="h-10 min-w-72 rounded-md border px-3 text-sm" placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <Button
          variant="danger"
          disabled={isPending || !quantity}
          onClick={() =>
            startTransition(async () => {
              const result = await disposeBatchAction({ batchId, containerId: containerId || undefined, quantity: Number(quantity), reason, notes });
              setMessage(result.success ? "Disposal logged. Refreshing..." : result.error.message);
              if (result.success) window.location.reload();
            })
          }
        >
          <Trash2 className="h-4 w-4" />
          Dispose
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
