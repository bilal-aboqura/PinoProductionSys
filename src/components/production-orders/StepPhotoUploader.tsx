"use client";

import { useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductionOrderStepPhotoDto } from "@/features/production-orders/types";

export function StepPhotoUploader({
  orderId,
  stepId,
  photos
}: {
  orderId: string;
  stepId: string;
  photos: ProductionOrderStepPhotoDto[];
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold hover:bg-accent/45">
        <Camera className="h-4 w-4" />
        Upload photo
        <input
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setMessage("");
            startTransition(async () => {
              const formData = new FormData();
              formData.append("file", file);
              const response = await fetch(`/api/production-orders/${orderId}/steps/${stepId}/photo`, { method: "POST", body: formData });
              const result = (await response.json()) as { success: boolean; error?: string };
              setMessage(result.success ? "Photo uploaded. Refreshing..." : result.error ?? "Upload failed.");
              if (result.success) window.location.reload();
            });
          }}
        />
      </label>
      {isPending ? <p className="text-sm text-secondary">Uploading...</p> : null}
      {message ? <p className="text-sm text-secondary">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <Button key={photo.id} className="h-8 px-2 text-xs" variant="ghost" title={photo.storagePath}>
            Photo
          </Button>
        ))}
        {photos.length === 0 ? <p className="text-sm text-secondary">No photos uploaded yet.</p> : null}
      </div>
    </div>
  );
}
