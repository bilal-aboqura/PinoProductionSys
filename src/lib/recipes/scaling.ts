import { Prisma } from "@prisma/client";
import type { RecipeSnapshot } from "./snapshot";

export type ScaledRecipeIngredient = {
  id: string;
  inventoryItemId: string;
  inventoryItemNameAr: string;
  inventoryItemNameEn: string;
  baseQuantity: string;
  scaledQuantity: string;
  unit: string;
  purpose: string | null;
  sortOrder: number;
};

type ScaleSummary = {
  baseYieldQuantity: string;
  baseYieldUnit: string;
  scaledQuantity: string;
  scaledUnit: string;
  scaleMode: "base" | "target" | "produced";
};

function formatDecimal(value: Prisma.Decimal, decimalPlaces = 3) {
  return value.toDecimalPlaces(decimalPlaces, Prisma.Decimal.ROUND_HALF_UP).toString();
}

export function scaleRecipeIngredients(
  snapshot: RecipeSnapshot,
  quantity?: Prisma.Decimal.Value | null
): { ingredients: ScaledRecipeIngredient[]; summary: ScaleSummary } {
  const baseYieldQuantity = new Prisma.Decimal(snapshot.yieldQuantity);
  const scaledQuantity = quantity == null ? baseYieldQuantity : new Prisma.Decimal(quantity);
  const ratio = scaledQuantity.div(baseYieldQuantity);

  return {
    ingredients: snapshot.ingredients.map((ingredient) => ({
      id: ingredient.id,
      inventoryItemId: ingredient.inventoryItemId,
      inventoryItemNameAr: ingredient.inventoryItemNameAr,
      inventoryItemNameEn: ingredient.inventoryItemNameEn,
      baseQuantity: ingredient.quantity,
      scaledQuantity: formatDecimal(new Prisma.Decimal(ingredient.quantity).mul(ratio)),
      unit: ingredient.unit,
      purpose: ingredient.purpose,
      sortOrder: ingredient.sortOrder
    })),
    summary: {
      baseYieldQuantity: snapshot.yieldQuantity,
      baseYieldUnit: snapshot.yieldUnit,
      scaledQuantity: formatDecimal(scaledQuantity),
      scaledUnit: snapshot.yieldUnit,
      scaleMode: quantity == null ? "base" : "target"
    }
  };
}

export function scaleProducedRecipeIngredients(
  snapshot: RecipeSnapshot,
  quantity?: Prisma.Decimal.Value | null
): { ingredients: ScaledRecipeIngredient[]; summary: ScaleSummary } {
  const scaled = scaleRecipeIngredients(snapshot, quantity);
  return {
    ...scaled,
    summary: {
      ...scaled.summary,
      scaleMode: quantity == null ? "base" : "produced"
    }
  };
}
