import type { RecipeStatus, ScopeType, ShelfLifeUnit, StorageMethod, Unit, YieldUnit } from "@prisma/client";
import type { RecipeSnapshot } from "@/lib/recipes/snapshot";

export type RecipeCategoryDto = {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type RecipeIngredientDto = {
  id: string;
  inventoryItemId: string;
  inventoryItemNameAr: string;
  inventoryItemNameEn: string;
  quantity: string;
  unit: string;
  purpose: string | null;
  sortOrder: number;
  normalizedUnit?: string;
  referenceProfileId?: string;
  lineCost?: string;
  lineCalories?: string;
};

export type RecipeStepDto = {
  id: string;
  stepNumber: number;
  title: string;
  instructions: string;
  estimatedMinutes: number | null;
  requiresPhoto: boolean;
  requiresNotes: boolean;
};

export type RecipeAssignmentDto = {
  id: string;
  scopeType: ScopeType;
  scopeId: string;
  assignedAt: string;
};

export type RecipeListItemDto = {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  status: RecipeStatus;
  categoryNameAr: string | null;
  categoryNameEn: string | null;
  yieldQuantity: string;
  yieldUnit: YieldUnit;
  shelfLifeValue: number;
  shelfLifeUnit: ShelfLifeUnit;
  storageMethod: StorageMethod;
  publishedVersion: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type RecipeDetailDto = RecipeListItemDto & {
  category: { id: string; nameAr: string; nameEn: string } | null;
  description: string | null;
  storageNotes: string | null;
  productionNotes: string | null;
  version: number;
  createdAt: string;
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
  assignments: RecipeAssignmentDto[];
  servingQuantity: string | null;
  servingUnit: Unit | null;
  servingLabel: string | null;
  currentSellingPrice: string | null;
  currencyCode: string;
  calculations: RecipeCalculationDto | null;
};

export type RecipeCalculationDto = ReturnType<typeof import("@/lib/recipes/calculations").serializeCalculation>;

export type RecipeVersionSummaryDto = {
  versionNumber: number;
  publishedAt: string;
  publishedByName: string;
  totalCost: string;
  totalCalories: string;
  profitMarginSnapshot: string | null;
};

export type RecipeVersionDto = RecipeVersionSummaryDto & {
  snapshot: RecipeSnapshot;
};

export type ActiveOrderSummary = {
  id: string;
  name: string;
};

export type RecipeSortKey = "nameAr" | "nameEn" | "updatedAt" | "publishedAt" | "category";

