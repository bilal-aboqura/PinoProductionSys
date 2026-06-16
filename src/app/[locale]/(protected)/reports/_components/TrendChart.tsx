import type { TrendPoint } from "@/features/reports/types";

export function TrendChart({ title, points }: { title: string; points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((point) => point.value));

  return (
    <div className="rounded-md border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 flex h-36 items-end gap-2">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-sm bg-primary"
              style={{ height: `${Math.max(8, (point.value / max) * 112)}px` }}
              title={`${point.label}: ${point.value}`}
            />
            <span className="w-full truncate text-center text-[11px] text-muted">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
