"use client";

import { Printer } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updatePrintJobStatus } from "@/features/printing/actions";

export function PrintControls({ jobId }: { jobId: string }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function printAndLog() {
    window.print();
    startTransition(async () => {
      const result = await updatePrintJobStatus({ jobId, status: "COMPLETED" });
      setMessage(result.success ? "Print logged." : result.error);
    });
  }

  return (
    <div className="print-hidden fixed right-4 top-4 z-10 flex items-center gap-3 rounded-md border bg-white p-3 shadow-sm">
      <Button onClick={printAndLog} disabled={isPending}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
      {message ? <span className="text-sm font-semibold text-secondary">{message}</span> : null}
    </div>
  );
}
