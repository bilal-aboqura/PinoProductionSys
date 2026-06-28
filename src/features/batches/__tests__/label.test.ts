import { describe, expect, it } from "vitest";
import { buildTraceabilityUrl } from "../qr";
import { quantitiesMatchTotal } from "../utils";
import { printLabelSchema } from "../validation";

describe("label and container rules", () => {
  it("requires a reason for reprints", () => {
    const result = printLabelSchema.safeParse({
      batchId: "batch_1",
      template: "STANDARD",
      isReprint: true,
      reprintReason: "bad"
    });
    expect(result.success).toBe(false);
  });

  it("accepts normal first prints without a reason", () => {
    const result = printLabelSchema.safeParse({
      batchId: "batch_1",
      template: "SMALL",
      isReprint: false
    });
    expect(result.success).toBe(true);
  });

  it("validates split quantities against the batch total", () => {
    expect(quantitiesMatchTotal([5, "5.000", 5], "15.000")).toBe(true);
    expect(quantitiesMatchTotal([5, 4], "15.000")).toBe(false);
  });

  it("builds container-specific traceability URLs", () => {
    expect(buildTraceabilityUrl("B-2026-00005", "ar", "", "B-2026-00005-C1")).toBe(
      "/ar/inventory/batches/B-2026-00005?container=B-2026-00005-C1"
    );
  });
});
