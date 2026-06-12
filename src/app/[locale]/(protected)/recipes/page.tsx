import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { RecipeListTable } from "@/components/recipes/RecipeListTable";
import { listRecipeCategories, listRecipes } from "@/features/recipes/actions";
import { getServerSession } from "@/lib/auth";
import { CREATE_RECIPES, MANAGE_RECIPE_CATEGORIES, VIEW_RECIPES, requirePermission } from "@/lib/permissions";

export default async function RecipesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  try {
    requirePermission(session, VIEW_RECIPES);
  } catch {
    return <AccessDenied locale={locale} />;
  }

  const [recipesResult, categoriesResult] = await Promise.all([listRecipes(), listRecipeCategories()]);
  const recipes = recipesResult.success ? recipesResult.data.items : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <section className="logical-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-secondary">Production / Recipes</p>
          <h1 className="text-3xl font-bold">Recipes</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {session.user.permissions.includes(MANAGE_RECIPE_CATEGORIES) ? (
            <Link href={`/${locale}/recipes/categories`}>
              <Button variant="secondary">Categories</Button>
            </Link>
          ) : null}
          {session.user.permissions.includes(CREATE_RECIPES) ? (
            <Link href={`/${locale}/recipes/new`}>
              <Button>New Recipe</Button>
            </Link>
          ) : null}
        </div>
      </div>
      <RecipeListTable recipes={recipes} categories={categories} locale={locale} />
    </section>
  );
}

