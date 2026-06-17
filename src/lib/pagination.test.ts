import { describe, expect, it } from "vitest";
import { pageHref, paginationInput, parsePage, totalPages } from "./pagination";

describe("pagination", () => {
  it("normalizes invalid page parameters", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
    expect(parsePage("not-a-page")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });

  it("calculates bounded Prisma skip and take values", () => {
    expect(paginationInput(3, 25)).toEqual({ page: 3, pageSize: 25, skip: 50, take: 25 });
    expect(paginationInput(-1, 1000)).toEqual({ page: 1, pageSize: 100, skip: 0, take: 100 });
  });

  it("always returns at least one display page", () => {
    expect(totalPages(0, 25)).toBe(1);
    expect(totalPages(101, 25)).toBe(5);
  });

  it("preserves filters while replacing the page parameter", () => {
    expect(pageHref("/en/inventory", 3, { page: "2", search: "flour", status: ["ACTIVE", "LOW"] })).toBe(
      "/en/inventory?search=flour&status=ACTIVE&status=LOW&page=3"
    );
    expect(pageHref("/en/inventory", 1, { search: "flour" })).toBe("/en/inventory?search=flour");
  });
});
