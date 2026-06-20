"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchCombobox } from "@/components/shared/SearchCombobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecipeStatusBadge } from "@/components/recipes/RecipeStatusBadge";
import type { RecipeCategoryDto, RecipeListItemDto } from "@/features/recipes/types";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("workspace");
  const common = useTranslations("common");
  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-3">
        <SearchCombobox className="w-full max-w-sm" name="search" source="recipes" placeholder={t("selectRecipe")} defaultValue={defaultFilters.search} />
        <select className="h-10 rounded-md border bg-white px-3 text-sm" name="status" defaultValue={defaultFilters.status ?? ""}>
          <option value="">{t("allStatuses")}</option>
          <option value="DRAFT">{t("draft")}</option>
          <option value="ACTIVE">{common("active")}</option>
          <option value="ARCHIVED">{t("archived")}</option>
        </select>
        <select className="h-10 rounded-md border bg-white px-3 text-sm" name="categoryId" defaultValue={defaultFilters.categoryId ?? ""}>
          <option value="">{t("allCategories")}</option>
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {locale === "ar" ? item.nameAr : item.nameEn}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">{t("apply")}</Button>
      </form>
      <div className="overflow-x-auto rounded-md border bg-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("code")}</TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{common("status")}</TableHead>
              <TableHead>{t("yield")}</TableHead>
              <TableHead>{t("shelfLife")}</TableHead>
              <TableHead>{t("published")}</TableHead>
              <TableHead>{t("updated")}</TableHead>
              <TableHead className="w-16">{t("open")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.map((recipe) => (
              <TableRow key={recipe.id} title={`Storage: ${recipe.storageMethod}`}>
                <TableCell className="font-mono text-xs">{recipe.code}</TableCell>
                <TableCell>
                  <div className="font-cairo font-semibold">{recipe.nameAr}</div>
                  <div className="font-inter text-sm text-secondary">{recipe.nameEn || t("noEnglishName")}</div>
                </TableCell>
                <TableCell>
                  <div className="font-cairo">{recipe.categoryNameAr ?? t("noCategory")}</div>
                  <div className="text-sm text-secondary">{recipe.categoryNameEn ?? ""}</div>
                </TableCell>
                <TableCell>
                  <RecipeStatusBadge status={recipe.status} />
                </TableCell>
                <TableCell>{`${recipe.yieldQuantity} ${recipe.yieldUnit}`}</TableCell>
                <TableCell>{`${recipe.shelfLifeValue} ${recipe.shelfLifeUnit}`}</TableCell>
                <TableCell>v{recipe.publishedVersion}</TableCell>
                <TableCell>{new Date(recipe.updatedAt).toLocaleDateString(locale)}</TableCell>
                <TableCell>
                  <Link href={`/${locale}/recipes/${recipe.id}`}>
                    <Button className="h-9 w-9 px-0" variant="ghost" title={t("open")}>
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
