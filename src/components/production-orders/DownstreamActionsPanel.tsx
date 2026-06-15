"use client";

import { useState, useTransition } from "react";
import { Barcode, Boxes, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBatchRecord, triggerInventoryConsumption, triggerLabelPrint } from "@/features/production-orders/actions";
import type { ProductionOrderDownstreamActionDto } from "@/features/production-orders/types";

const labels = {
  INVENTORY_CONSUMPTION: "Inventory consumption",
  BATCH_RECORD: "Batch record",
  LABEL_PRINT: "Label print"
} as const;

function actionFor(actions: ProductionOrderDownstreamActionDto[], type: ProductionOrderDownstreamActionDto["actionType"]) {
  return actions.find((action) => action.actionType === type);
}

export function DownstreamActionsPanel({ orderId, actions }: { orderId: string; actions: ProductionOrderDownstreamActionDto[] }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const inventoryAction = actionFor(actions, "INVENTORY_CONSUMPTION");
  const batchAction = actionFor(actions, "BATCH_RECORD");
  const labelAction = actionFor(actions, "LABEL_PRINT");
  const openLabelPdf = () => window.open(`/api/production-orders/${orderId}/label`, "_blank", "noopener,noreferrer");
  const run = (action: () => Promise<{ success: boolean; error?: string; data?: { referenceId: string; alreadyRecorded: boolean } }>, label: string) => {
    setMessage("");
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.success
          ? `${label} ${result.data?.alreadyRecorded ? "was already recorded" : "recorded"}${result.data?.referenceId ? `: ${result.data.referenceId}` : ""}. Refreshing...`
          : result.error ?? "Action failed."
      );
      if (result.success && label === "Label print") openLabelPdf();
      if (result.success) window.location.reload();
    });
  };
  const rows = [
    { type: "INVENTORY_CONSUMPTION" as const, action: inventoryAction },
    { type: "BATCH_RECORD" as const, action: batchAction },
    { type: "LABEL_PRINT" as const, action: labelAction }
  ];

  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Downstream Actions</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={isPending || Boolean(inventoryAction)} onClick={() => run(() => triggerInventoryConsumption(orderId), "Inventory consumption")}>
          <Boxes className="h-4 w-4" />
          {inventoryAction ? "Inventory Recorded" : "Record Inventory Consumption"}
        </Button>
        <Button disabled={isPending || Boolean(batchAction)} variant="secondary" onClick={() => run(() => createBatchRecord(orderId), "Batch record")}>
          <Barcode className="h-4 w-4" />
          {batchAction ? "Batch Recorded" : "Create Batch Record"}
        </Button>
        <Button
          disabled={isPending}
          variant="ghost"
          onClick={() => (labelAction ? openLabelPdf() : run(() => triggerLabelPrint(orderId), "Label print"))}
        >
          <Printer className="h-4 w-4" />
          {labelAction ? "Open Label PDF" : "Print Label"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
      <div className="mt-4 grid gap-2">
        {rows.map((row) => (
          <div key={row.type} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-accent/25 px-3 py-2 text-sm">
            <span className="font-semibold">{labels[row.type]}</span>
            {row.action ? (
              <span className="flex flex-wrap items-center gap-2">
                <Badge className="bg-success/15 text-success">Recorded</Badge>
                <span className="font-mono text-xs">{row.action.referenceId}</span>
                <span className="text-secondary">{new Date(row.action.triggeredAt).toLocaleString()}</span>
              </span>
            ) : (
              <Badge>Not recorded</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
