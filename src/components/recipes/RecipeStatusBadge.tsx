import type { RecipeStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<RecipeStatus, string> = {
  DRAFT: "bg-muted/15 text-muted",
  ACTIVE: "bg-success/15 text-success",
  ARCHIVED: "bg-warning/20 text-secondary"
};

const labels: Record<RecipeStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived"
};

export function RecipeStatusBadge({ status }: { status: RecipeStatus }) {
  return <Badge className={cn("min-w-20 justify-center", styles[status])}>{labels[status]}</Badge>;
}

