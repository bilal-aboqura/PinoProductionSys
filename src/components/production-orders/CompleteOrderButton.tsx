"use client";

import { useMemo, useState, useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeProductionOrder } from "@/features/production-orders/actions";

export function CompleteOrderButton({ orderId, version, targetQuantity, unit }: { orderId: string; version: number; targetQuantity: string | null; unit: string }) {
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const warning = useMemo(() => {
    const target = Number(targetQuantity);
    const actual = Number(quantity);
    if (!target || !actual) return "";
    return Math.abs(actual - target) / target > 0.2 ? "Produced quantity differs from target by more than 20%." : "";
  }, [quantity, targetQuantity]);

  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Complete Order</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Produced quantity ({unit})</label>
          <Input className="w-48" min="0.001" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
        <Button
          disabled={isPending || !quantity}
          onClick={() =>
            startTransition(async () => {
              const result = await completeProductionOrder(orderId, Number(quantity), version);
              setMessage(result.success ? "Order completed. Refreshing..." : result.error);
              if (result.success) window.location.reload();
            })
          }
        >
          <PackageCheck className="h-4 w-4" />
          Complete Order
        </Button>
      </div>
      {warning ? <p className="mt-2 text-sm font-semibold text-warning">{warning}</p> : null}
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
