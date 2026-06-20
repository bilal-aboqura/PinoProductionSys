import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/Pagination";
import { RecipeListTable } from "@/components/recipes/RecipeListTable";
import { listRecipeCategories, listRecipes } from "@/features/recipes/actions";
import { parsePage } from "@/lib/pagination";
import { getServerSession } from "@/lib/auth";
import { CREATE_RECIPES, MANAGE_RECIPE_CATEGORIES } from "@/lib/permissions";
import { resolvePermissions } from "@/features/permissions/lib/resolver";
import { getTranslations } from "next-intl/server";

export default async function RecipesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; categoryId?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "workspace" });
  const query = await searchParams;
  const session = await getServerSession();
  const permissions = new Set(await resolvePermissions(session.user.id));
  const status = query.status === "DRAFT" || query.status === "ACTIVE" || query.status === "ARCHIVED" ? query.status : undefined;
  const [recipesResult, categoriesResult] = await Promise.all([
    listRecipes({ search: query.search, categoryId: query.categoryId, status }, { page: parsePage(query.page), pageSize: 25 }),
    listRecipeCategories()
  ]);
  const recipes = recipesResult.success ? recipesResult.data.items : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <section className="logical-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">{t("recipesBreadcrumb")}</p>
          <h1 className="text-3xl font-bold">{t("recipes")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.has(MANAGE_RECIPE_CATEGORIES) ? (
            <Link href={`/${locale}/recipes/categories`}>
              <Button variant="secondary">{t("categories")}</Button>
            </Link>
          ) : null}
          {permissions.has(CREATE_RECIPES) ? (
            <Link href={`/${locale}/recipes/new`}>
              <Button>{t("newRecipe")}</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <RecipeListTable recipes={recipes} categories={categories} locale={locale} defaultFilters={query} />
      {recipesResult.success ? (
        <div className="mt-4">
          <Pagination
            pathname={`/${locale}/recipes`}
            page={recipesResult.data.page}
            totalPages={recipesResult.data.totalPages}
            totalItems={recipesResult.data.total}
            searchParams={query}
            itemLabel={t("recipes").toLocaleLowerCase(locale)}
          />
        </div>
      ) : null}
    </section>
  );
}
