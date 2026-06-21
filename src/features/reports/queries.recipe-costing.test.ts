import { describe, expect, it } from "vitest";
import { recipeCostingColumns } from "./calculations";

describe("recipe costing report contracts", () => {
  it("exposes frozen snapshot columns", () => {
    const keys = recipeCostingColumns.map((column) => column.key);
    expect(keys).toEqual(expect.arrayContaining(["totalCost", "totalCalories", "costPerUnit", "publishedAt"]));
  });
});
