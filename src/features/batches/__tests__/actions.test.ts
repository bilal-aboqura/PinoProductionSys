import { describe, expect, it } from "vitest";
import { calculateExpiryDate, nextBatchNumberFromExisting } from "../utils";

describe("batch creation rules", () => {
  it("generates a zero-padded yearly batch sequence", () => {
    expect(nextBatchNumberFromExisting(2026, null)).toBe("B-2026-00001");
    expect(nextBatchNumberFromExisting(2026, "B-2026-00041")).toBe("B-2026-00042");
  });

  it("calculates expiry dates from recipe shelf-life units", () => {
    const producedAt = new Date("2026-06-13T08:00:00.000Z");
    expect(calculateExpiryDate(producedAt, 12, "HOURS").toISOString()).toBe("2026-06-13T20:00:00.000Z");
    expect(calculateExpiryDate(producedAt, 7, "DAYS").toISOString()).toBe("2026-06-20T08:00:00.000Z");
    expect(calculateExpiryDate(producedAt, 2, "WEEKS").toISOString()).toBe("2026-06-27T08:00:00.000Z");
  });
});
