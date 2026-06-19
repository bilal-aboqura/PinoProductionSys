"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
            setPreviewUrl((current) => {
              if (current) URL.revokeObjectURL(current);
              return URL.createObjectURL(file);
            });
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
      {previewUrl ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Selected photo</p>
          <Image className="h-28 w-28 rounded-md border object-cover" src={previewUrl} alt="Selected upload preview" width={112} height={112} unoptimized />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          photo.url ? (
            <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" title="Open uploaded photo">
              <Image className="h-28 w-28 rounded-md border object-cover" src={photo.url} alt="Uploaded production evidence" width={112} height={112} unoptimized />
            </a>
          ) : (
            <span key={photo.id} className="rounded-md border px-3 py-2 text-xs text-secondary">Photo unavailable</span>
          )
        ))}
        {photos.length === 0 ? <p className="text-sm text-secondary">No photos uploaded yet.</p> : null}
      </div>
    </div>
  );
}
