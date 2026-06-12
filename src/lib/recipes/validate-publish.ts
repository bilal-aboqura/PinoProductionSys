import { prisma } from "@/lib/prisma";

export async function validateRecipeForPublish(recipeId: string): Promise<{ valid: boolean; errors: string[] }> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: true,
      steps: true,
      category: true
    }
  });

  if (!recipe) {
    return { valid: false, errors: ["Recipe not found."] };
  }

  const errors: string[] = [];
  if (recipe.nameAr.trim().length < 2) errors.push("Arabic name is required.");
  if (recipe.nameEn.trim().length < 2) errors.push("English name is required.");
  if (!/^RCP-\d{3,6}$/i.test(recipe.code)) errors.push("Recipe code must match RCP-0001 format.");
  if (!recipe.categoryId || !recipe.category?.isActive) errors.push("An active category is required.");
  if (Number(recipe.yieldQuantity) <= 0) errors.push("Yield quantity must be greater than zero.");
  if (recipe.shelfLifeValue <= 0) errors.push("Shelf life must be greater than zero.");
  if (recipe.storageMethod === "CUSTOM" && !recipe.storageNotes?.trim()) errors.push("Storage notes are required for custom storage.");
  if (!recipe.ingredients.some((ingredient) => Number(ingredient.quantity) > 0 && ingredient.unit.trim())) {
    errors.push("At least one ingredient with a positive quantity is required.");
  }
  if (!recipe.steps.some((step) => step.title.trim() && step.instructions.trim())) {
    errors.push("At least one production step is required.");
  }

  return { valid: errors.length === 0, errors };
}

