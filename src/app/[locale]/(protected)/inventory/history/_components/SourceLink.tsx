import Link from "next/link";
import type { MovementDto } from "@/features/inventory/types";

export function SourceLink({ movement, locale }: { movement: MovementDto; locale: string }) {
  if (!movement.sourceRefId) return <span className="text-muted">None</span>;
  if (movement.sourceType === "production") {
    return (
      <Link className="font-semibold text-primary hover:underline" href={`/${locale}/production/${movement.sourceRefId}`}>
        Production
      </Link>
    );
  }
  return <span className="font-semibold text-secondary">{movement.sourceType}: {movement.sourceRefId.slice(0, 8)}</span>;
}
