import { Badge } from "@/components/ui/badge";
import type { ProductionOrderDetailDto, ProductionOrderStepDto } from "@/features/production-orders/types";
import { StepEvidenceSummary } from "./StepEvidenceSummary";
import { StepNotesInput } from "./StepNotesInput";
import { StepPhotoUploader } from "./StepPhotoUploader";
import { StepQuantityConfirm } from "./StepQuantityConfirm";

export function StepExecutionCard({
  order,
  step,
  locked
}: {
  order: ProductionOrderDetailDto;
  step: ProductionOrderStepDto;
  locked: boolean;
}) {
  const terminal = order.status === "COMPLETED" || order.status === "CANCELLED";
  const active = !terminal && !locked && !step.isCompleted && order.canExecute;

  return (
    <div className={`rounded-md border bg-white p-5 shadow-sm ${locked ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">Step {step.stepNumber}</p>
          <h2 className="text-xl font-bold">{step.title}</h2>
        </div>
        <Badge className={step.isCompleted ? "bg-success/15 text-success" : locked ? "bg-accent text-secondary" : "bg-primary/15 text-primary"}>
          {step.isCompleted ? "Completed" : locked ? "Locked" : "Active"}
        </Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{step.instructions}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {step.estimatedMinutes ? <Badge>{step.estimatedMinutes} min</Badge> : null}
        {step.requiresPhoto ? <Badge>Photo required</Badge> : null}
        {step.requiresNotes ? <Badge>Notes required</Badge> : null}
        {step.requiresQuantity ? <Badge>Qty required</Badge> : null}
      </div>
      <div className="mt-4 space-y-4">
        {step.isCompleted || terminal ? <StepEvidenceSummary step={step} /> : null}
        {active ? (
          <>
            <StepPhotoUploader orderId={order.id} stepId={step.id} photos={step.photos} />
            <StepNotesInput orderId={order.id} stepId={step.id} notes={step.notes} />
            <StepQuantityConfirm
              orderId={order.id}
              stepId={step.id}
              version={order.version}
              unit={order.yieldUnit}
              requiresQuantity={step.requiresQuantity}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
