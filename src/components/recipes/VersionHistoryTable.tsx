import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RecipeVersionSummaryDto } from "@/features/recipes/types";

export function VersionHistoryTable({ versions, locale, recipeId }: { versions: RecipeVersionSummaryDto[]; locale: string; recipeId: string }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>Published By</TableHead>
            <TableHead>Published At</TableHead>
            <TableHead>Total Cost</TableHead>
            <TableHead>Total Calories</TableHead>
            <TableHead>Margin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((version) => (
            <TableRow key={version.versionNumber}>
              <TableCell>
                <Link className="font-semibold text-primary" href={`/${locale}/recipes/${recipeId}/versions/${version.versionNumber}`}>
                  v{version.versionNumber}
                </Link>
              </TableCell>
              <TableCell>{version.publishedByName}</TableCell>
              <TableCell>{new Date(version.publishedAt).toLocaleString()}</TableCell>
              <TableCell>{version.totalCost} SAR</TableCell>
              <TableCell>{version.totalCalories} kcal</TableCell>
              <TableCell>{version.profitMarginSnapshot ? `${version.profitMarginSnapshot}%` : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

