import { describe, expect, it } from "vitest";
import { scaleProducedRecipeIngredients, scaleRecipeIngredients } from "./scaling";
import type { RecipeSnapshot } from "./snapshot";

const snapshot: RecipeSnapshot = {
  recipeId: "recipe-1",
  versionNumber: 1,
  nameAr: "صلصة طماطم",
  nameEn: "Tomato Sauce",
  code: "TS-001",
  categoryId: null,
  categoryNameAr: null,
  categoryNameEn: null,
  description: null,
  yieldQuantity: "1",
  yieldUnit: "KG",
  serving: null,
  calculations: {
    currency: "SAR",
    totalCost: "10.00",
    totalCalories: "100.00",
    costPerYieldUnit: "10.0000",
    caloriesPerYieldUnit: "100.0000",
    caloriesPerServing: null,
    sellingPriceSnapshot: null,
    profitAmountSnapshot: null,
    profitMarginSnapshot: null,
    missingSellingPrice: true,
    lines: []
  },
  shelfLifeValue: 3,
  shelfLifeUnit: "DAY",
  storageMethod: "AMBIENT",
  storageNotes: null,
  productionNotes: null,
  ingredients: [
    {
      id: "ing-1",
      inventoryItemId: "item-1",
      inventoryItemNameAr: "طماطم",
      inventoryItemNameEn: "Tomato",
      quantity: "0.500",
      unit: "KG",
      purpose: null,
      sortOrder: 1,
      referenceProfileId: "ref-1",
      normalizedUnit: "KG",
      lineCost: "5.00",
      lineCalories: "50.00"
    }
  ],
  steps: [
    {
      id: "step-1",
      stepNumber: 1,
      title: "Mix",
      instructions: "Mix everything well.",
      estimatedMinutes: 10,
      requiresPhoto: false,
      requiresNotes: false
    }
  ],
  publishedAt: new Date("2026-07-01T00:00:00.000Z").toISOString(),
  publishedById: "user-1"
};

describe("recipe ingredient scaling", () => {
  it("scales ingredient quantities to the target production quantity", () => {
    const result = scaleRecipeIngredients(snapshot, "10");

    expect(result.summary.scaleMode).toBe("target");
    expect(result.summary.scaledQuantity).toBe("10");
    expect(result.ingredients[0]?.scaledQuantity).toBe("5");
  });

  it("marks completed production scaling as produced quantities", () => {
    const result = scaleProducedRecipeIngredients(snapshot, "2.500");

    expect(result.summary.scaleMode).toBe("produced");
    expect(result.summary.scaledQuantity).toBe("2.5");
    expect(result.ingredients[0]?.scaledQuantity).toBe("1.25");
  });
});
