import { Badge } from "@/components/ui/badge";
import type { ScaledRecipeIngredient } from "@/lib/recipes/scaling";

function quantityLabel(scaleMode: "base" | "target" | "produced") {
  if (scaleMode === "produced") return "Produced quantity";
  if (scaleMode === "target") return "Target quantity";
  return "Recipe yield";
}

export function ScaledIngredientsCard({
  title,
  description,
  ingredients,
  baseYieldQuantity,
  baseYieldUnit,
  scaledQuantity,
  scaledUnit,
  scaleMode
}: {
  title: string;
  description: string;
  ingredients: ScaledRecipeIngredient[];
  baseYieldQuantity: string;
  baseYieldUnit: string;
  scaledQuantity: string;
  scaledUnit: string;
  scaleMode: "base" | "target" | "produced";
}) {
  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-secondary">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{quantityLabel(scaleMode)}: {scaledQuantity} {scaledUnit}</Badge>
          <Badge className="bg-surface-subtle text-secondary">Base recipe: {baseYieldQuantity} {baseYieldUnit}</Badge>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ingredients.map((ingredient) => (
          <div key={ingredient.id} className="rounded-md border bg-surface-subtle p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{ingredient.inventoryItemNameEn || ingredient.inventoryItemNameAr}</div>
                {ingredient.purpose ? <p className="mt-1 text-xs text-secondary">{ingredient.purpose}</p> : null}
              </div>
              <Badge>{ingredient.scaledQuantity} {ingredient.unit}</Badge>
            </div>
            {ingredient.scaledQuantity !== ingredient.baseQuantity ? (
              <p className="mt-2 text-xs text-secondary">Base recipe: {ingredient.baseQuantity} {ingredient.unit}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
