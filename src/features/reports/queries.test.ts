import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { pageInput, toNumber, trendFromRows } from "./calculations";

describe("report query helpers", () => {
  it("normalizes pagination bounds", () => {
    expect(pageInput(-4, 500)).toEqual({ page: 1, pageSize: 100, skip: 0 });
    expect(pageInput(3, 25)).toEqual({ page: 3, pageSize: 25, skip: 50 });
  });

  it("converts decimal aggregate values to numbers", () => {
    expect(toNumber(new Prisma.Decimal("12.50"))).toBe(12.5);
    expect(toNumber(null)).toBe(0);
  });

  it("aggregates trend values into daily buckets", () => {
    const dayOne = new Date("2026-06-13T00:00:00.000Z");
    const dayTwo = new Date("2026-06-14T00:00:00.000Z");
    const trend = trendFromRows(
      [dayOne, dayTwo],
      [
        { date: new Date("2026-06-13T10:00:00.000Z"), value: 4 },
        { date: new Date("2026-06-13T20:00:00.000Z"), value: 6 },
        { date: new Date("2026-06-14T12:00:00.000Z"), value: 3 }
      ]
    );

    expect(trend.map((point) => point.value)).toEqual([10, 3]);
  });
});
