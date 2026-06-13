"use client";

import { useState, useTransition } from "react";
import { Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { claimProductionOrder } from "@/features/production-orders/actions";

export function ClaimOrderButton({ orderId, version }: { orderId: string; version: number }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="space-y-1">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimProductionOrder(orderId, version);
            setMessage(result.success ? "Claimed. Refreshing..." : result.error);
            if (result.success) window.location.reload();
          })
        }
      >
        <Hand className="h-4 w-4" />
        Claim
      </Button>
      {message ? <p className="text-xs text-secondary">{message}</p> : null}
    </div>
  );
}
