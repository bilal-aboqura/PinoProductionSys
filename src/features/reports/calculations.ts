import { Prisma } from "@prisma/client";
import type { TrendPoint } from "./types";

export function toNumber(value: Prisma.Decimal | number | bigint | null | undefined) {
  if (value == null) return 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return value.toNumber();
}

export function pageInput(page?: number, limit?: number) {
  const safePage = Math.max(1, page ?? 1);
  const pageSize = Math.min(100, Math.max(1, limit ?? 50));
  return { page: safePage, pageSize, skip: (safePage - 1) * pageSize };
}

export function trendFromRows(days: Date[], rows: { date: Date; value: number }[]): TrendPoint[] {
  return days.map((day) => {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const value = rows
      .filter((row) => row.date >= day && row.date < next)
      .reduce((sum, row) => sum + row.value, 0);
    return { label: day.toLocaleDateString("en", { month: "short", day: "numeric" }), value };
  });
}
