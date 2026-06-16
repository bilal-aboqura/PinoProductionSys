import { describe, expect, it } from "vitest";
import { diffRecords } from "../audit-diff";

describe("settings audit diff", () => {
  it("returns only changed keys in sorted order", () => {
    const diff = diffRecords(
      { nameEn: "Cold Room", nameAr: "Cold", isActive: true },
      { nameEn: "Cold Room 2", nameAr: "Cold", isActive: false }
    );

    expect(diff.changedKeys).toEqual(["isActive", "nameEn"]);
    expect(diff.previousValue).toEqual({ isActive: true, nameEn: "Cold Room" });
    expect(diff.newValue).toEqual({ isActive: false, nameEn: "Cold Room 2" });
  });

  it("handles new records without previous state", () => {
    const diff = diffRecords(null, { code: "WH-MAIN", isActive: true });
    expect(diff.changedKeys).toEqual(["code", "isActive"]);
  });
});
