"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { archiveRecipeCategory } from "@/features/recipes/actions";
import type { RecipeCategoryDto } from "@/features/recipes/types";

export function CategoryTable({ categories, locale }: { categories: RecipeCategoryDto[]; locale: string }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories
      .filter((category) => !needle || category.nameAr.toLowerCase().includes(needle) || category.nameEn.toLowerCase().includes(needle))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.nameEn.localeCompare(b.nameEn));
  }, [categories, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input className="max-w-sm" placeholder="Search categories" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Link href={`/${locale}/recipes/categories/new`}>
          <Button>New Category</Button>
        </Link>
      </div>
      <div className="overflow-x-auto rounded-md border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="font-cairo font-semibold">{category.nameAr}</div>
                  <div className="font-inter text-sm text-secondary">{category.nameEn}</div>
                </TableCell>
                <TableCell>
                  <Badge className={category.isActive ? "bg-success/15 text-success" : "bg-warning/20 text-secondary"}>
                    {category.isActive ? "Active" : "Archived"}
                  </Badge>
                </TableCell>
                <TableCell>{category.sortOrder}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/${locale}/recipes/categories/${category.id}`}>
                      <Button className="h-9 w-9 px-0" variant="ghost" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      className="h-9 w-9 px-0"
                      variant="ghost"
                      title="Archive"
                      disabled={pending}
                      onClick={() => startTransition(() => void archiveRecipeCategory(category.id))}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

