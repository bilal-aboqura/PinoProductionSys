import { describe, expect, it } from "vitest";
import { buildTraceabilityUrl } from "../qr";
import { traceabilitySchema } from "../validation";

describe("traceability lookup rules", () => {
  it("accepts only canonical batch numbers", () => {
    expect(traceabilitySchema.safeParse({ batchNumber: "B-2026-00001" }).success).toBe(true);
    expect(traceabilitySchema.safeParse({ batchNumber: "2026-00001" }).success).toBe(false);
  });

  it("builds a gated in-app traceability URL", () => {
    expect(buildTraceabilityUrl("B-2026-00001", "en", "https://pino.example")).toBe("https://pino.example/en/inventory/batches/B-2026-00001?view=scan");
  });
});
