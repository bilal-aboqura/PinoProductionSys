import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { calculateRecipe, serializeCalculation } from "./calculations";

describe("profitability snapshots", () => {
  it("freezes the supplied selling price in serialized output", () => {
    const calculation = calculateRecipe({ lines: [], yieldQuantity: 1, sellingPrice: new Prisma.Decimal(25) });
    const frozen = serializeCalculation(calculation);
    expect(frozen.sellingPriceSnapshot).toBe("25.00");
    expect(frozen.profitAmountSnapshot).toBe("25.00");
    expect(frozen.profitMarginSnapshot).toBe("100.0000");
  });
});
