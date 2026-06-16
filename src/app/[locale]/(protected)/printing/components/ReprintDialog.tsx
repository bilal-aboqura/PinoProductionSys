"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recordReprint } from "@/features/printing/actions";

export function ReprintDialog({ jobId, locale, canReprint }: { jobId: string; locale: string; canReprint: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"DAMAGE" | "LOSS" | "PRINT_ERROR" | "OTHER">("DAMAGE");
  const [customReason, setCustomReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    setMessage("");
    startTransition(async () => {
      const result = await recordReprint({ printJobId: jobId, reason, customReason });
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      window.open(`/${locale}/printing/label/${jobId}`, "_blank", "noopener,noreferrer");
      setOpen(false);
    });
  }

  if (!canReprint) {
    return (
      <Button variant="ghost" disabled title="Supervisor or administrator required">
        <RotateCcw className="h-4 w-4" />
        Reprint
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen((value) => !value)}>
        <RotateCcw className="h-4 w-4" />
        Reprint
      </Button>
      <Link className="ml-2 text-sm font-semibold text-primary" href={`/${locale}/printing/label/${jobId}`} target="_blank">
        Preview
      </Link>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border bg-white p-4 shadow-lg">
          <h3 className="font-bold">Reprint reason</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Reason
              <select className="rounded-md border bg-white px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>
                <option value="DAMAGE">Damage</option>
                <option value="LOSS">Loss</option>
                <option value="PRINT_ERROR">Print error</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Notes
              <textarea className="min-h-20 rounded-md border px-3 py-2" value={customReason} onChange={(event) => setCustomReason(event.target.value)} />
            </label>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={isPending}>
                Confirm
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
            {message ? <p className="text-sm font-semibold text-error">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
