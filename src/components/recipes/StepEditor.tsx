"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addStep, deleteStep } from "@/features/recipes/actions";
import type { RecipeStepDto } from "@/features/recipes/types";

export function StepEditor({ recipeId, version, steps }: { recipeId: string; version: number; steps: RecipeStepDto[] }) {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      await addStep(
        recipeId,
        {
          stepNumber: steps.length + 1,
          title: String(formData.get("title") ?? ""),
          instructions: String(formData.get("instructions") ?? ""),
          estimatedMinutes: Number(formData.get("estimatedMinutes") ?? 0) || undefined,
          requiresPhoto: formData.get("requiresPhoto") === "on",
          requiresNotes: formData.get("requiresNotes") === "on"
        },
        version
      );
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Steps</h2>
      {warning ? <div className="rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-secondary">{warning}</div> : null}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="rounded-md border bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{step.stepNumber}. {step.title}</h3>
              <Button
                className="h-9 w-9 px-0"
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const result = await deleteStep(recipeId, step.id, version);
                  if (result.success && "lastStep" in result.data && result.data.lastStep) {
                    setWarning("Deleting this step leaves the recipe with no steps.");
                  }
                  router.refresh();
                })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-secondary">{step.instructions}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
              {step.estimatedMinutes ? <span>{step.estimatedMinutes} min</span> : null}
              {step.requiresPhoto ? <span>Photo required</span> : null}
              {step.requiresNotes ? <span>Notes required</span> : null}
            </div>
          </div>
        ))}
      </div>
      <form action={submit} className="grid gap-2 rounded-md border bg-surface p-3">
        <Input name="title" placeholder="Step title" required />
        <textarea name="instructions" className="min-h-20 rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" placeholder="Instructions" required />
        <div className="grid gap-2 md:grid-cols-3">
          <Input name="estimatedMinutes" type="number" placeholder="Minutes" />
          <label className="flex items-center gap-2 text-sm"><input name="requiresPhoto" type="checkbox" /> Requires photo</label>
          <label className="flex items-center gap-2 text-sm"><input name="requiresNotes" type="checkbox" /> Requires notes</label>
        </div>
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" /> Add Step
        </Button>
      </form>
    </section>
  );
}

