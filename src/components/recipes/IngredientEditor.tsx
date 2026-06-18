"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { addIngredient, removeIngredient } from "@/features/recipes/actions";
import type { RecipeIngredientDto } from "@/features/recipes/types";

export function IngredientEditor({ recipeId, version, ingredients }: { recipeId: string; version: number; ingredients: RecipeIngredientDto[] }) {
  const router = useRouter();
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setWarning(null);
    startTransition(async () => {
      const result = await addIngredient(
        recipeId,
        {
          inventoryItemId: String(formData.get("inventoryItemId") ?? ""),
          quantity: Number(formData.get("quantity") ?? 0),
          unit: String(formData.get("unit") ?? ""),
          purpose: String(formData.get("purpose") ?? ""),
          sortOrder: ingredients.length + 1
        },
        version
      );
      if (result.success && "hasDuplicate" in result.data && result.data.hasDuplicate) {
        setWarning("This ingredient appears multiple times - is this intentional?");
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">Ingredients</h2>
      {warning ? <div className="rounded-md border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-secondary">{warning}</div> : null}
      <div className="space-y-2">
        {ingredients.map((ingredient) => (
          <div key={ingredient.id} className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-[1fr_120px_100px_1fr_44px]">
            <div className="font-semibold">{ingredient.inventoryItemId}</div>
            <div>{ingredient.quantity}</div>
            <div>{ingredient.unit}</div>
            <div className="text-secondary">{ingredient.purpose}</div>
            <Button
              className="h-9 w-9 px-0"
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(async () => {
                await removeIngredient(recipeId, ingredient.id, version);
                router.refresh();
              })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <form action={submit} className="grid gap-2 rounded-md border bg-surface p-3 md:grid-cols-[1fr_120px_100px_1fr_44px]">
        <SearchCombobox name="inventoryItemId" source="inventory-item-ids" placeholder="Select inventory item" required />
        <Input name="quantity" type="number" step="0.001" placeholder="Qty" required />
        <Input name="unit" placeholder="Unit" required />
        <Input name="purpose" placeholder="Purpose" />
        <Button className="h-10 w-10 px-0" type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}
