import { Prisma, type Unit } from "@prisma/client";
import { normalizeAgainstReference, type ReferenceProfileValues } from "./reference-profiles";
import { getActiveReferenceProfiles } from "./reference-profiles";
import { prisma } from "@/lib/prisma";

export type RecipeCalculationLineInput = {
  id: string;
  inventoryItemId: string;
  quantity: Prisma.Decimal.Value;
  unit: Unit;
  profile: ReferenceProfileValues;
};

export type RecipeCalculationInput = {
  lines: RecipeCalculationLineInput[];
  yieldQuantity?: Prisma.Decimal.Value | null;
  servingQuantity?: Prisma.Decimal.Value | null;
  sellingPrice?: Prisma.Decimal.Value | null;
  currency?: string;
};

export function calculateRecipe(input: RecipeCalculationInput) {
  const lines = input.lines.map((line) => {
    const costRatio = normalizeAgainstReference(line.quantity, line.unit, line.profile.costReferenceQuantity, line.profile.costReferenceUnit);
    const calorieRatio = normalizeAgainstReference(line.quantity, line.unit, line.profile.calorieReferenceQuantity, line.profile.calorieReferenceUnit);
    return {
      recipeIngredientId: line.id,
      inventoryItemId: line.inventoryItemId,
      quantity: new Prisma.Decimal(line.quantity),
      unit: line.unit,
      normalizedUnit: line.profile.costReferenceUnit,
      referenceProfileId: line.profile.id,
      lineCost: costRatio.mul(line.profile.costReferenceValue),
      lineCalories: calorieRatio.mul(line.profile.calorieValue)
    };
  });
  const totalCost = lines.reduce((sum, line) => sum.add(line.lineCost), new Prisma.Decimal(0));
  const totalCalories = lines.reduce((sum, line) => sum.add(line.lineCalories), new Prisma.Decimal(0));
  const yieldQuantity = input.yieldQuantity == null ? null : new Prisma.Decimal(input.yieldQuantity);
  const servingQuantity = input.servingQuantity == null ? null : new Prisma.Decimal(input.servingQuantity);
  const validYield = yieldQuantity?.gt(0) ? yieldQuantity : null;
  const validServing = servingQuantity?.gt(0) ? servingQuantity : null;
  const costPerYieldUnit = validYield ? totalCost.div(validYield) : null;
  const caloriesPerYieldUnit = validYield ? totalCalories.div(validYield) : null;
  const caloriesPerServing = caloriesPerYieldUnit && validServing ? caloriesPerYieldUnit.mul(validServing) : null;
  const sellingPrice = input.sellingPrice == null ? null : new Prisma.Decimal(input.sellingPrice);
  const profitAmount = sellingPrice && costPerYieldUnit ? sellingPrice.sub(costPerYieldUnit) : null;
  const profitMargin = sellingPrice?.gt(0) && profitAmount ? profitAmount.div(sellingPrice).mul(100) : null;
  return {
    currency: input.currency ?? "SAR",
    lines,
    totalCost,
    totalCalories,
    costPerYieldUnit,
    caloriesPerYieldUnit,
    caloriesPerServing,
    sellingPriceSnapshot: sellingPrice,
    profitAmountSnapshot: profitAmount,
    profitMarginSnapshot: profitMargin,
    missingSellingPrice: !sellingPrice
  };
}

export function serializeCalculation(calculation: ReturnType<typeof calculateRecipe>) {
  const value = (decimal: Prisma.Decimal | null, places = 4) => decimal?.toFixed(places) ?? null;
  return {
    currency: calculation.currency,
    totalCost: value(calculation.totalCost, 2)!,
    totalCalories: value(calculation.totalCalories, 2)!,
    costPerYieldUnit: value(calculation.costPerYieldUnit),
    caloriesPerYieldUnit: value(calculation.caloriesPerYieldUnit),
    caloriesPerServing: value(calculation.caloriesPerServing),
    sellingPriceSnapshot: value(calculation.sellingPriceSnapshot, 2),
    profitAmountSnapshot: value(calculation.profitAmountSnapshot, 2),
    profitMarginSnapshot: value(calculation.profitMarginSnapshot),
    missingSellingPrice: calculation.missingSellingPrice,
    lines: calculation.lines.map((line) => ({
      recipeIngredientId: line.recipeIngredientId,
      inventoryItemId: line.inventoryItemId,
      quantity: line.quantity.toString(),
      unit: line.unit,
      normalizedUnit: line.normalizedUnit,
      referenceProfileId: line.referenceProfileId,
      lineCost: line.lineCost.toFixed(2),
      lineCalories: line.lineCalories.toFixed(2)
    }))
  };
}

export async function calculateRecipeById(recipeId: string, at = new Date()) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { orderBy: { sortOrder: "asc" } } }
  });
  if (!recipe) throw new Error("NOT_FOUND");
  const profiles = await getActiveReferenceProfiles([...new Set(recipe.ingredients.map((line) => line.inventoryItemId))], at);
  const missing = recipe.ingredients.filter((line) => !profiles.has(line.inventoryItemId));
  if (missing.length) throw new Error(`MISSING_REFERENCE_PROFILE:${missing.map((line) => line.inventoryItemId).join(",")}`);
  return calculateRecipe({
    lines: recipe.ingredients.map((line) => ({
      id: line.id,
      inventoryItemId: line.inventoryItemId,
      quantity: line.quantity,
      unit: line.unit as Unit,
      profile: profiles.get(line.inventoryItemId)!
    })),
    yieldQuantity: recipe.yieldQuantity,
    servingQuantity: recipe.servingQuantity,
    sellingPrice: recipe.currentSellingPrice,
    currency: recipe.currencyCode
  });
}
