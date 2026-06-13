import type { ProductionOrderStepDto } from "@/features/production-orders/types";

export function StepEvidenceSummary({ step }: { step: ProductionOrderStepDto }) {
  return (
    <div className="grid gap-2 text-sm">
      <p className="font-semibold text-secondary">Evidence</p>
      <p>Photos: {step.photos.length}</p>
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
