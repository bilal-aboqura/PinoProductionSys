"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProductionOrder } from "@/features/production-orders/actions";
import type { AssignableStaffDto, CreatableRecipeVersionDto } from "@/features/production-orders/types";

export function CreateOrderForm({
  recipes,
  staff,
  locale
}: {
  recipes: CreatableRecipeVersionDto[];
  staff: AssignableStaffDto[];
  locale: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recipeVersionId, setRecipeVersionId] = useState(recipes[0]?.id ?? "");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [creationNotes, setCreationNotes] = useState("");
  const [message, setMessage] = useState("");
  const selected = useMemo(() => recipes.find((recipe) => recipe.id === recipeVersionId), [recipeVersionId, recipes]);

  return (
    <form
      className="max-w-3xl space-y-5 rounded-md border bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");
        startTransition(async () => {
          const result = await createProductionOrder({
            recipeVersionId,
            targetQuantity: targetQuantity ? Number(targetQuantity) : undefined,
            assignedToId: assignedToId || null,
            creationNotes
          });
          if (!result.success) {
            setMessage(result.details?.join(", ") || result.error);
            return;
          }
          router.push(`/${locale}/production/${result.data.id}`);
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="recipe">Recipe version</Label>
        <select
          id="recipe"
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={recipeVersionId}
          onChange={(event) => setRecipeVersionId(event.target.value)}
          required
        >
          {recipes.map((recipe) => (
            <option key={recipe.id} value={recipe.id}>
              {recipe.recipeName} · v{recipe.versionNumber}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="quantity">Target quantity {selected ? `(${selected.yieldUnit})` : ""}</Label>
        <Input id="quantity" min="0.001" step="0.001" type="number" value={targetQuantity} onChange={(event) => setTargetQuantity(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="assignee">Assignee</Label>
        <select
          id="assignee"
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={assignedToId}
          onChange={(event) => setAssignedToId(event.target.value)}
        >
          <option value="">Leave unassigned</option>
          {staff.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Creation notes</Label>
        <textarea
          id="notes"
          className="min-h-28 rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/30"
          maxLength={2000}
          value={creationNotes}
          onChange={(event) => setCreationNotes(event.target.value)}
        />
      </div>
      {message ? <p className="text-sm font-semibold text-error">{message}</p> : null}
      <Button type="submit" disabled={isPending || recipes.length === 0}>
        <ClipboardPlus className="h-4 w-4" />
        {isPending ? "Creating..." : "Create Order"}
      </Button>
    </form>
  );
}
