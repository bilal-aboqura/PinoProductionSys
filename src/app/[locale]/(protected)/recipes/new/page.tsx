import Link from "next/link";
import { RecipeCreateForm } from "@/components/recipes/RecipeCreateForm";
import { listRecipeCategories } from "@/features/recipes/actions";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { getServerSession } from "@/lib/auth";
import { CREATE_RECIPES } from "@/lib/permissions";
import { resolvePermissions } from "@/features/permissions/lib/resolver";

export default async function NewRecipePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  const permissions = await resolvePermissions(session.user.id);
  if (!permissions.includes(CREATE_RECIPES)) {
    return <AccessDenied locale={locale} />;
  }
  const categories = await listRecipeCategories();

  return (
    <section className="logical-container py-8">
      <Link className="text-sm font-semibold text-primary" href={`/${locale}/recipes`}>
        Back to recipes
      </Link>
      <div className="mb-6 mt-3">
        <p className="text-sm font-semibold text-secondary">Recipes / New</p>
        <h1 className="text-3xl font-bold">New Recipe</h1>
      </div>
      <div className="rounded-md border bg-surface p-5">
        <RecipeCreateForm categories={categories.success ? categories.data : []} locale={locale} />
      </div>
    </section>
  );
}
