"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startProductionOrder } from "@/features/production-orders/actions";

export function StartProductionButton({ orderId, version }: { orderId: string; version: number }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startProductionOrder(orderId, version);
            setMessage(result.success ? "Production started. Refreshing..." : result.error);
            if (result.success) window.location.reload();
          })
        }
      >
        <Play className="h-4 w-4" />
        Start Production
      </Button>
      {message ? <p className="text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
