import { AccessDenied } from "@/components/shared/AccessDenied";
import { CategoryTable } from "@/components/recipes/categories/CategoryTable";
import { listRecipeCategories } from "@/features/recipes/actions";
import { getServerSession } from "@/lib/auth";
import { MANAGE_RECIPE_CATEGORIES, requirePermission } from "@/lib/permissions";

export default async function RecipeCategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  try {
    requirePermission(session, MANAGE_RECIPE_CATEGORIES);
  } catch {
    return <AccessDenied locale={locale} />;
  }
  const categories = await listRecipeCategories();
  return (
    <section className="logical-container py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-secondary">Recipes / Categories</p>
        <h1 className="text-3xl font-bold">Recipe Categories</h1>
      </div>
      <CategoryTable categories={categories.success ? categories.data : []} locale={locale} />
    </section>
  );
}

