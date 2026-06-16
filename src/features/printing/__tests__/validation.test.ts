import { describe, expect, it } from "vitest";
import { createPrintJobSchema, printerConfigSchema, reprintSchema } from "../validation";

describe("printing validation", () => {
  it("accepts a valid thermal printer configuration", () => {
    expect(
      printerConfigSchema.safeParse({
        name: "Kitchen Thermal Printer",
        description: "Kitchen labels",
        type: "THERMAL",
        isDefault: true,
        isActive: true
      }).success
    ).toBe(true);
  });

  it("rejects empty printer names and invalid print quantities", () => {
    expect(printerConfigSchema.safeParse({ name: "", type: "STANDARD", isDefault: false, isActive: true }).success).toBe(false);
    expect(createPrintJobSchema.safeParse({ targetType: "BATCH", targetId: "B-1", templateId: "tpl", quantity: 0 }).success).toBe(false);
  });

  it("requires custom notes for Other reprint reasons", () => {
    expect(reprintSchema.safeParse({ printJobId: "job-1", reason: "DAMAGE" }).success).toBe(true);
    expect(reprintSchema.safeParse({ printJobId: "job-1", reason: "OTHER" }).success).toBe(false);
    expect(reprintSchema.safeParse({ printJobId: "job-1", reason: "OTHER", customReason: "Label smudged after cooling" }).success).toBe(true);
  });
});
