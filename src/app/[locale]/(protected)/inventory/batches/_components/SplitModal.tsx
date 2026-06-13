"use client";

import { Split } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { splitBatchContainersAction } from "@/features/batches/actions";

export function SplitModal({ batchId, disabled }: { batchId: string; disabled?: boolean }) {
  const [quantities, setQuantities] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">Container Split</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Quantities</label>
          <input
            className="h-10 w-72 rounded-md border px-3 text-sm"
            placeholder="5, 5, 5"
            value={quantities}
            onChange={(event) => setQuantities(event.target.value)}
            disabled={disabled}
          />
        </div>
        <Button
          variant="secondary"
          disabled={disabled || isPending || !quantities.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await splitBatchContainersAction({
                batchId,
                quantities: quantities.split(",").map((value) => Number(value.trim()))
              });
              setMessage(result.success ? "Containers created. Refreshing..." : result.error.message);
              if (result.success) window.location.reload();
            })
          }
        >
          <Split className="h-4 w-4" />
          Split
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
