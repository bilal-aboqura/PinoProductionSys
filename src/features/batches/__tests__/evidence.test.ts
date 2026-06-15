import { describe, expect, it } from "vitest";
import { maxEvidenceBytes, validateEvidenceFile } from "../validation";

describe("batch evidence validation", () => {
  it("accepts supported evidence files under 5MB", () => {
    expect(validateEvidenceFile({ type: "application/pdf", size: maxEvidenceBytes })).toEqual({ valid: true });
    expect(validateEvidenceFile({ type: "image/png", size: 1024 })).toEqual({ valid: true });
  });

  it("rejects oversized or unsupported evidence files", () => {
    expect(validateEvidenceFile({ type: "application/pdf", size: maxEvidenceBytes + 1 }).valid).toBe(false);
    expect(validateEvidenceFile({ type: "text/plain", size: 1024 }).valid).toBe(false);
  });
});
