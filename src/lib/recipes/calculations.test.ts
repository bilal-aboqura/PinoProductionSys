import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateRecipe, serializeCalculation } from "./calculations";

const profile = {
  id: "profile-1",
  inventoryItemId: "flour",
  costReferenceQuantity: new Prisma.Decimal(30),
  costReferenceUnit: "GRAM" as const,
  costReferenceValue: new Prisma.Decimal(50),
  calorieReferenceQuantity: new Prisma.Decimal(100),
  calorieReferenceUnit: "GRAM" as const,
  calorieValue: new Prisma.Decimal(364),
  effectiveAt: new Date("2026-01-01")
};

describe("calculateRecipe", () => {
  it("calculates normalized line, yield, serving, and profit values", () => {
    const result = serializeCalculation(calculateRecipe({
      lines: [{ id: "line-1", inventoryItemId: "flour", quantity: 300, unit: "GRAM", profile }],
      yieldQuantity: 100,
      servingQuantity: 2,
      sellingPrice: 20
    }));
    expect(result.totalCost).toBe("500.00");
    expect(result.totalCalories).toBe("1092.00");
    expect(result.costPerYieldUnit).toBe("5.0000");
    expect(result.caloriesPerServing).toBe("21.8400");
    expect(result.profitAmountSnapshot).toBe("15.00");
    expect(result.profitMarginSnapshot).toBe("75.0000");
  });

  it("converts kilograms to grams and rejects piece conversion", () => {
    expect(serializeCalculation(calculateRecipe({ lines: [{ id: "1", inventoryItemId: "flour", quantity: 1, unit: "KG", profile }] })).totalCost).toBe("1666.67");
    expect(() => calculateRecipe({ lines: [{ id: "1", inventoryItemId: "flour", quantity: 1, unit: "PIECE", profile }] })).toThrow("INVALID_UNIT_CONVERSION");
  });

  it("returns null derived values for missing yield and price", () => {
    const result = serializeCalculation(calculateRecipe({ lines: [] }));
    expect(result.costPerYieldUnit).toBeNull();
    expect(result.caloriesPerServing).toBeNull();
    expect(result.missingSellingPrice).toBe(true);
  });
});
