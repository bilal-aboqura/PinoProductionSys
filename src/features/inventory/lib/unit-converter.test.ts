import { describe, expect, it } from "vitest";
import { convertUnit, convertUnitWithContext } from "./unit-converter";

describe("convertUnit", () => {
  it("converts between compatible weight units", () => {
    expect(convertUnit(2, "KG", "GRAM").toString()).toBe("2000");
    expect(convertUnit(500, "GRAM", "KG").toString()).toBe("0.5");
  });

  it("converts between compatible volume units", () => {
    expect(convertUnit(1.5, "LITER", "MILLILITER").toString()).toBe("1500");
    expect(convertUnit(250, "MILLILITER", "LITER").toString()).toBe("0.25");
  });

  it("blocks incompatible conversions", () => {
    expect(() => convertUnit(1, "KG", "LITER")).toThrow("INVALID_UNIT_CONVERSION");
  });

  it("uses unit weight when converting pieces to weight", () => {
    expect(convertUnitWithContext(2, "PIECE", "KG", { unitWeightKg: 1.5 }).toString()).toBe("3");
    expect(convertUnitWithContext(3000, "GRAM", "PIECE", { unitWeightKg: 1.5 }).toString()).toBe("2");
  });
});
