import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecipeListTable } from "@/components/recipes/RecipeListTable";
import { listRecipeCategories, listRecipes } from "@/features/recipes/actions";

export default async function RecipesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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
          <Link href={`/${locale}/recipes/categories`}>
            <Button variant="secondary">Categories</Button>
          </Link>
          <Link href={`/${locale}/recipes/new`}>
            <Button>New Recipe</Button>
          </Link>
        </div>
      </div>
      <RecipeListTable recipes={recipes} categories={categories} locale={locale} />
    </section>
  );
}
