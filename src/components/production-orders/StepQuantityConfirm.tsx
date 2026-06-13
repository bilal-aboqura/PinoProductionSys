"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { completeStep } from "@/features/production-orders/actions";

export function StepQuantityConfirm({
  orderId,
  stepId,
  version,
  unit,
  requiresQuantity
}: {
  orderId: string;
  stepId: string;
  version: number;
  unit: string;
  requiresQuantity: boolean;
}) {
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2">
      {requiresQuantity ? (
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Confirmed quantity ({unit})</label>
          <Input className="w-48" min="0.001" step="0.001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        </div>
      ) : null}
      <Button
        disabled={isPending || (requiresQuantity && !quantity)}
        onClick={() =>
          startTransition(async () => {
            const result = await completeStep(orderId, stepId, { confirmedQuantity: quantity ? Number(quantity) : undefined, confirmedUnit: unit }, version);
            setMessage(result.success ? "Step completed. Refreshing..." : result.details?.join(", ") || result.error);
            if (result.success) window.location.reload();
          })
        }
      >
        <CheckCircle2 className="h-4 w-4" />
        Complete Step
      </Button>
      {message ? <p className="w-full text-sm font-semibold text-secondary">{message}</p> : null}
    </div>
  );
}
