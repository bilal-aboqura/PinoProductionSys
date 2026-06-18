"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecipeStatusBadge } from "@/components/recipes/RecipeStatusBadge";
import type { RecipeCategoryDto, RecipeListItemDto } from "@/features/recipes/types";

export function RecipeListTable({
  recipes,
  categories,
  locale,
  defaultFilters = {}
}: {
  recipes: RecipeListItemDto[];
  categories: RecipeCategoryDto[];
  locale: string;
  defaultFilters?: { search?: string; categoryId?: string; status?: string };
}) {
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-3">
        <SearchCombobox className="w-full max-w-sm" name="search" source="recipes" placeholder="Select recipe, code, or name" defaultValue={defaultFilters.search} />
        <select className="h-10 rounded-md border bg-white px-3 text-sm" name="status" defaultValue={defaultFilters.status ?? ""}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select className="h-10 rounded-md border bg-white px-3 text-sm" name="categoryId" defaultValue={defaultFilters.categoryId ?? ""}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nameEn}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">Apply</Button>
        <Link className="ms-auto" href={`/${locale}/recipes/new`}>
          <Button>New Recipe</Button>
        </Link>
      </form>
      <div className="overflow-x-auto rounded-md border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Yield</TableHead>
              <TableHead>Shelf Life</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-16">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.map((recipe) => (
              <TableRow key={recipe.id} title={`Storage: ${recipe.storageMethod}`}>
                <TableCell className="font-mono text-xs">{recipe.code}</TableCell>
                <TableCell>
                  <div className="font-cairo font-semibold">{recipe.nameAr}</div>
                  <div className="font-inter text-sm text-secondary">{recipe.nameEn || "No English name"}</div>
                </TableCell>
                <TableCell>
                  <div className="font-cairo">{recipe.categoryNameAr ?? "No category"}</div>
                  <div className="text-sm text-secondary">{recipe.categoryNameEn ?? ""}</div>
                </TableCell>
                <TableCell>
                  <RecipeStatusBadge status={recipe.status} />
                </TableCell>
                <TableCell>{`${recipe.yieldQuantity} ${recipe.yieldUnit}`}</TableCell>
                <TableCell>{`${recipe.shelfLifeValue} ${recipe.shelfLifeUnit}`}</TableCell>
                <TableCell>v{recipe.publishedVersion}</TableCell>
                <TableCell>{new Date(recipe.updatedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Link href={`/${locale}/recipes/${recipe.id}`}>
                    <Button className="h-9 w-9 px-0" variant="ghost" title="Open">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
