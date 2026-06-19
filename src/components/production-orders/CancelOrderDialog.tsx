"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelProductionOrder } from "@/features/production-orders/actions";

export function CancelOrderDialog({ orderId, version }: { orderId: string; version: number }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Cancel Order</h2>
      <textarea
        className="mt-3 min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Cancellation reason"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="danger"
          disabled={isPending || reason.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelProductionOrder(orderId, reason, version);
              setMessage(result.success ? "Order cancelled." : result.details?.join(", ") || result.error);
              if (result.success) router.refresh();
            })
          }
        >
          <Ban className="h-4 w-4" />
          Confirm Cancellation
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
