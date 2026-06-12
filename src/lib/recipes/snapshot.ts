import { prisma } from "@/lib/prisma";

export type RecipeSnapshot = {
  recipeId: string;
  versionNumber: number;
  nameAr: string;
  nameEn: string;
  code: string;
  categoryId: string | null;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  description: string | null;
  yieldQuantity: string;
  yieldUnit: string;
  shelfLifeValue: number;
  shelfLifeUnit: string;
  storageMethod: string;
  storageNotes: string | null;
  productionNotes: string | null;
  ingredients: Array<{
    id: string;
    inventoryItemId: string;
    inventoryItemNameAr: string;
    inventoryItemNameEn: string;
    quantity: string;
    unit: string;
    purpose: string | null;
    sortOrder: number;
  }>;
  steps: Array<{
    id: string;
    stepNumber: number;
    title: string;
    instructions: string;
    estimatedMinutes: number | null;
    requiresPhoto: boolean;
    requiresNotes: boolean;
  }>;
  publishedAt: string;
  publishedById: string | null;
};

export async function buildRecipeSnapshot(recipeId: string): Promise<RecipeSnapshot> {
  const recipe = await prisma.recipe.findUniqueOrThrow({
    where: { id: recipeId },
    include: {
      category: true,
      ingredients: { orderBy: { sortOrder: "asc" } },
      steps: { orderBy: { stepNumber: "asc" } }
    }
  });

  return {
    recipeId: recipe.id,
    versionNumber: recipe.publishedVersion + 1,
    nameAr: recipe.nameAr,
    nameEn: recipe.nameEn,
    code: recipe.code,
    categoryId: recipe.categoryId,
    categoryNameAr: recipe.category?.nameAr || recipe.category?.name || null,
    categoryNameEn: recipe.category?.nameEn || recipe.category?.name || null,
    description: recipe.description,
    yieldQuantity: recipe.yieldQuantity.toString(),
    yieldUnit: recipe.yieldUnit,
    shelfLifeValue: recipe.shelfLifeValue,
    shelfLifeUnit: recipe.shelfLifeUnit,
    storageMethod: recipe.storageMethod,
    storageNotes: recipe.storageNotes,
    productionNotes: recipe.productionNotes,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      inventoryItemId: ingredient.inventoryItemId,
      inventoryItemNameAr: ingredient.inventoryItemId,
      inventoryItemNameEn: ingredient.inventoryItemId,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      purpose: ingredient.purpose,
      sortOrder: ingredient.sortOrder
    })),
    steps: recipe.steps.map((step) => ({
      id: step.id,
      stepNumber: step.stepNumber,
      title: step.title,
      instructions: step.instructions,
      estimatedMinutes: step.estimatedMinutes,
      requiresPhoto: step.requiresPhoto,
      requiresNotes: step.requiresNotes
    })),
    publishedAt: new Date().toISOString(),
    publishedById: recipe.publishedById
  };
}

