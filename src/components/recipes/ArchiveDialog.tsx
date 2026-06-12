"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveRecipe, restoreRecipe } from "@/features/recipes/actions";
import type { ActiveOrderSummary } from "@/features/recipes/types";

export function ArchiveDialog({ recipeId, status }: { recipeId: string; status: "ACTIVE" | "ARCHIVED" | "DRAFT" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<ActiveOrderSummary[]>([]);
  const [pending, startTransition] = useTransition();

  if (status === "DRAFT") return null;

  if (status === "ARCHIVED") {
    return (
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => startTransition(async () => {
          await restoreRecipe(recipeId);
          router.refresh();
        })}
      >
        <RotateCcw className="h-4 w-4" />
        Restore
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => startTransition(async () => {
          const result = await archiveRecipe(recipeId, false);
          if (result.success && "warning" in result.data) {
            setOrders(result.data.affectedOrders);
            setOpen(true);
            return;
          }
          router.refresh();
        })}
      >
        <Archive className="h-4 w-4" />
        Archive
      </Button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-md border border-warning bg-surface p-4 shadow-lg">
          <h3 className="font-bold text-secondary">Archive recipe?</h3>
          <p className="mt-2 text-sm text-secondary">Active production orders reference this recipe.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {orders.map((order) => (
              <li key={order.id}>{order.name} ({order.id})</li>
            ))}
          </ul>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => startTransition(async () => {
                await archiveRecipe(recipeId, true);
                setOpen(false);
                router.refresh();
              })}
            >
              Confirm
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

