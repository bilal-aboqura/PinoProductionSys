import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { disposeBatchSchema } from "../validation";

describe("batch disposal rules", () => {
  it("validates disposal request boundaries", () => {
    expect(disposeBatchSchema.safeParse({ batchId: "batch_1", quantity: 1, reason: "QUALITY_ISSUE" }).success).toBe(true);
    expect(disposeBatchSchema.safeParse({ batchId: "batch_1", quantity: 0, reason: "QUALITY_ISSUE" }).success).toBe(false);
    expect(disposeBatchSchema.safeParse({ batchId: "batch_1", quantity: 1, reason: "OTHER" }).success).toBe(false);
  });

  it("detects over-disposal with decimal quantities", () => {
    const available = new Prisma.Decimal("4.500");
    const requested = new Prisma.Decimal("5.000");
    expect(requested.gt(available)).toBe(true);
  });
});
