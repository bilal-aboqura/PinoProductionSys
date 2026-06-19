import { describe, expect, it } from "vitest";
import { generatePdfReport } from "./pdf";

describe("generatePdfReport", () => {
  it("generates a valid multi-page PDF", async () => {
    const body = await generatePdfReport({
      reportType: "PRODUCTION_SUMMARY",
      filters: {},
      columns: [{ key: "order", label: "Order" }, { key: "quantity", label: "Quantity", align: "right" }],
      rows: Array.from({ length: 80 }, (_, index) => ({ order: index === 0 ? "\u062f\u0642\u064a\u0642 2026464" : `PO-${index + 1}`, quantity: index + 1 })),
      exportedBy: "test@example.com"
    });

    expect(body.subarray(0, 4).toString()).toBe("%PDF");
    expect(body.length).toBeGreaterThan(1_000);
  });
});
