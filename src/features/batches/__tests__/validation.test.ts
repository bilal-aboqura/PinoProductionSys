import { describe, expect, it } from "vitest";
import { traceabilitySchema } from "../validation";

describe("batch traceability identifiers", () => {
  it.each(["B-2026-00001", "B-2026-REPORTS-001"])("accepts %s", (batchNumber) => {
    expect(traceabilitySchema.safeParse({ batchNumber }).success).toBe(true);
  });

  it("rejects path-like identifiers", () => {
    expect(traceabilitySchema.safeParse({ batchNumber: "../../admin" }).success).toBe(false);
  });
});
