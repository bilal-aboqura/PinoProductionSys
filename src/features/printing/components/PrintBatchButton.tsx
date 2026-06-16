"use client";

import { Printer } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createPrintJob } from "@/features/printing/actions";
import type { PrintTemplateDto, PrinterDto } from "@/features/printing/types";

export function PrintBatchButton({
  batchId,
  locale,
  templates,
  printers
}: {
  batchId: string;
  locale: string;
  templates: PrintTemplateDto[];
  printers: PrinterDto[];
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [printerId, setPrinterId] = useState(printers.find((printer) => printer.isDefault)?.id ?? printers[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage("");
    startTransition(async () => {
      const result = await createPrintJob({ targetType: "BATCH", targetId: batchId, templateId, printerId: printerId || null, quantity });
      if (!result.success || !result.jobId) {
        setMessage(result.success ? "Unable to create print job." : result.error);
        return;
      }
      window.open(`/${locale}/printing/label/${result.jobId}`, "_blank", "noopener,noreferrer");
      setOpen(false);
    });
  }

  if (templates.length === 0) return null;

  return (
    <div className="print-hidden rounded-md border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Batch Label</h2>
          <p className="text-sm text-secondary">Queue a thermal label with QR traceability.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Printer className="h-4 w-4" />
          Print Label
        </Button>
      </div>
      {open ? (
        <div className="mt-4 grid gap-3 rounded-md border bg-background p-4 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold">
            Template
            <select className="rounded-md border bg-white px-3 py-2" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Printer
            <select className="rounded-md border bg-white px-3 py-2" value={printerId} onChange={(event) => setPrinterId(event.target.value)}>
              <option value="">Browser default</option>
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Quantity
            <input className="rounded-md border px-3 py-2" type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </label>
          <div className="flex items-end gap-2">
            <Button onClick={submit} disabled={isPending || !templateId}>
              Queue
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {message ? <p className="md:col-span-4 text-sm font-semibold text-error">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
