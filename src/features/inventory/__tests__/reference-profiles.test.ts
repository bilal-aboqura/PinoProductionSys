import { describe, expect, it } from "vitest";
import { ingredientReferenceProfileSchema } from "../validation";
import { selectActiveReferenceProfile } from "@/lib/recipes/reference-profiles";

describe("ingredient reference profiles", () => {
  it("rejects non-positive quantities and mismatched unit families", () => {
    const result = ingredientReferenceProfileSchema.safeParse({ inventoryItemId: "1", costReferenceQuantity: 0, costReferenceUnit: "GRAM", costReferenceValue: 1, calorieReferenceQuantity: 100, calorieReferenceUnit: "LITER", calorieValue: 10 });
    expect(result.success).toBe(false);
  });

  it("selects the latest active effective profile", () => {
    const active = selectActiveReferenceProfile([
      { id: "old", effectiveAt: new Date("2026-01-01"), archivedAt: null },
      { id: "future", effectiveAt: new Date("2027-01-01"), archivedAt: null },
      { id: "current", effectiveAt: new Date("2026-06-01"), archivedAt: null }
    ], new Date("2026-06-21"));
    expect(active?.id).toBe("current");
  });
});
