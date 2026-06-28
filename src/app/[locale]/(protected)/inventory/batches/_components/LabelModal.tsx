"use client";

import { Printer } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { printBatchLabelAction } from "@/features/batches/actions";
import type { LabelData } from "@/features/batches/types";
import type { LabelTemplate } from "@prisma/client";
import { LabelPrintLayout } from "./LabelPrintLayout";

export function LabelModal({
  batchId,
  containers
}: {
  batchId: string;
  containers: { id: string; containerNumber: string }[];
}) {
  const [template, setTemplate] = useState<LabelTemplate>("STANDARD");
  const [containerId, setContainerId] = useState(containers[0]?.id ?? "");
  const [isReprint, setIsReprint] = useState(false);
  const [reprintReason, setReprintReason] = useState("");
  const [label, setLabel] = useState<LabelData | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3 print-hidden">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Template</label>
          <select className="h-10 rounded-md border px-3 text-sm" value={template} onChange={(event) => setTemplate(event.target.value as LabelTemplate)}>
            <option value="SMALL">Small 50x50mm</option>
            <option value="STANDARD">Standard 100x50mm</option>
            <option value="LARGE">Large 100x100mm</option>
          </select>
        </div>
        {containers.length ? (
          <div className="grid gap-1">
            <label className="text-sm font-semibold text-secondary">Container</label>
            <select className="h-10 rounded-md border px-3 text-sm" value={containerId} onChange={(event) => setContainerId(event.target.value)}>
              {containers.map((container) => (
                <option key={container.id} value={container.id}>
                  {container.containerNumber}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <label className="flex h-10 items-center gap-2 text-sm font-semibold text-secondary">
          <input type="checkbox" checked={isReprint} onChange={(event) => setIsReprint(event.target.checked)} />
          Reprint
        </label>
        {isReprint ? (
          <input
            className="h-10 min-w-64 rounded-md border px-3 text-sm"
            placeholder="Reprint reason"
            value={reprintReason}
            onChange={(event) => setReprintReason(event.target.value)}
          />
        ) : null}
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await printBatchLabelAction({
                batchId,
                containerId: containerId || undefined,
                template,
                isReprint,
                reprintReason
              });
              if (!result.success) {
                setMessage(result.error.message);
                return;
              }
              setLabel(result.data.labelData);
              setMessage(
                result.data.labelData.containerNumber
                  ? "Container label snapshot logged. Use print when the preview looks right."
                  : "Label snapshot logged. Use print when the preview looks right."
              );
            })
          }
        >
          <Printer className="h-4 w-4" />
          Preview
        </Button>
        {label ? (
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        ) : null}
      </div>
      {message ? <p className="mt-2 text-sm text-secondary print-hidden">{message}</p> : null}
      {label ? (
        <div className="mt-4">
          <LabelPrintLayout label={label} template={template} />
        </div>
      ) : null}
    </div>
  );
}
