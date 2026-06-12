"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecipeStatusBadge } from "@/components/recipes/RecipeStatusBadge";
import type { RecipeCategoryDto, RecipeListItemDto } from "@/features/recipes/types";

export function RecipeListTable({
  recipes,
  categories,
  locale
}: {
  recipes: RecipeListItemDto[];
  categories: RecipeCategoryDto[];
  locale: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesQuery =
        !needle ||
        recipe.nameAr.toLowerCase().includes(needle) ||
        recipe.nameEn.toLowerCase().includes(needle) ||
        recipe.code.toLowerCase().includes(needle);
      const matchesStatus = !status || recipe.status === status;
      const matchesCategory = !category || recipe.categoryNameEn === category || recipe.categoryNameAr === category;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [category, query, recipes, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder="Search recipes" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="h-10 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select className="h-10 rounded-md border bg-white px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.nameEn}>
              {item.nameEn}
            </option>
          ))}
        </select>
        <Link className="ms-auto" href={`/${locale}/recipes/new`}>
          <Button>New Recipe</Button>
        </Link>
      </div>
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
            {visible.map((recipe) => (
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

