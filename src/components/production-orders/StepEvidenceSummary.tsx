import Image from "next/image";
import type { ProductionOrderStepDto } from "@/features/production-orders/types";

export function StepEvidenceSummary({ step }: { step: ProductionOrderStepDto }) {
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-semibold text-secondary">Evidence</p>
      <p>Photos: {step.photos.length}</p>
      {step.photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {step.photos.map((photo) => (
            photo.url ? (
              <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" title="Open uploaded photo">
                <Image
                  className="h-28 w-28 rounded-md border object-cover"
                  src={photo.url}
                  alt="Production step evidence"
                  width={112}
                  height={112}
                  unoptimized
                />
              </a>
            ) : (
              <span key={photo.id} className="rounded-md border px-3 py-2 text-xs text-secondary">
                Photo unavailable
              </span>
            )
          ))}
        </div>
      ) : null}
      <p>Notes: {step.notes.length}</p>
      {step.confirmedQuantity ? <p>Quantity: {step.confirmedQuantity} {step.confirmedUnit}</p> : null}
      {step.notes.map((note) => (
        <p key={note.id} className="rounded-md bg-accent/35 px-3 py-2">
          {note.content}
        </p>
      ))}
    </div>
  );
}
