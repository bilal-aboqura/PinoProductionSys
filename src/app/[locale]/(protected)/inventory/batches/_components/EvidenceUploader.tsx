"use client";

import { Upload } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadProductionEvidenceAction } from "@/features/batches/actions";

export function EvidenceUploader({ batchId }: { batchId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold">Production Evidence</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <input
          className="h-10 rounded-md border px-3 py-2 text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button
          disabled={isPending || !file}
          onClick={() =>
            startTransition(async () => {
              if (!file) return;
              const formData = new FormData();
              formData.append("file", file);
              const result = await uploadProductionEvidenceAction(batchId, formData);
              setMessage(result.success ? "Evidence uploaded. Refreshing..." : result.error.message);
              if (result.success) window.location.reload();
            })
          }
        >
          <Upload className="h-4 w-4" />
          Upload
        </Button>
      </div>
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
