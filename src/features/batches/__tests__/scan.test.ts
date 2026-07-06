import { describe, expect, it } from "vitest";
import { buildBatchScanPath, parseBatchScanTarget } from "../scan";

describe("batch scan helpers", () => {
  it("routes a scanned batch number into scan view", () => {
    expect(parseBatchScanTarget("B-2026-00009")).toEqual({ batchNumber: "B-2026-00009" });
    expect(buildBatchScanPath("ar", { batchNumber: "B-2026-00009" })).toBe("/ar/inventory/batches/B-2026-00009?view=scan");
  });

  it("extracts the parent batch and container when a container number is scanned", () => {
    expect(parseBatchScanTarget("B-2026-00009-C3")).toEqual({
      batchNumber: "B-2026-00009",
      containerNumber: "B-2026-00009-C3"
    });
    expect(
      buildBatchScanPath("en", {
        batchNumber: "B-2026-00009",
        containerNumber: "B-2026-00009-C3"
      })
    ).toBe("/en/inventory/batches/B-2026-00009?view=scan&container=B-2026-00009-C3");
  });

  it("ignores non-batch scans", () => {
    expect(parseBatchScanTarget("ITEM-001")).toBeNull();
  });
});
