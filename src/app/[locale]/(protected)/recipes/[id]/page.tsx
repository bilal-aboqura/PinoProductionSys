import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { RecipeStatusBadge } from "@/components/recipes/RecipeStatusBadge";
import { RecipeForm } from "@/components/recipes/RecipeForm";
import { IngredientEditor } from "@/components/recipes/IngredientEditor";
import { StepEditor } from "@/components/recipes/StepEditor";
import { PublishButton } from "@/components/recipes/PublishButton";
import { ArchiveDialog } from "@/components/recipes/ArchiveDialog";
import { ScopeAssignmentPanel } from "@/components/recipes/ScopeAssignmentPanel";
import { getRecipe, listRecipeCategories } from "@/features/recipes/actions";
import { getServerSession } from "@/lib/auth";
import { resolvePermissions } from "@/features/permissions/lib/resolver";
import { ARCHIVE_RECIPES, EDIT_RECIPES, MANAGE_RECIPE_SCOPE, PUBLISH_RECIPES, VIEW_VERSION_HISTORY } from "@/lib/permissions";

export default async function RecipeDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getServerSession();
  const permissions = new Set(await resolvePermissions(session.user.id));
  const [recipeResult, categoriesResult] = await Promise.all([getRecipe(id), listRecipeCategories()]);
  if (!recipeResult.success) {
    if (recipeResult.code === "UNAUTHORIZED") return <AccessDenied locale={locale} />;
    notFound();
  }
  const recipe = recipeResult.data;
  const categories = categoriesResult.success ? categoriesResult.data : [];
  const canEdit = permissions.has(EDIT_RECIPES);

  return (
    <section className="logical-container space-y-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-semibold text-primary" href={`/${locale}/recipes`}>
            Back to recipes
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-cairo text-3xl font-bold">{recipe.nameAr}</h1>
            <RecipeStatusBadge status={recipe.status} />
          </div>
          <p className="font-inter text-secondary">{recipe.nameEn || recipe.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions.has(VIEW_VERSION_HISTORY) ? (
            <>
              <Link href={`/${locale}/recipes/${recipe.id}/versions`}>
                <Button variant="secondary">Versions</Button>
              </Link>
              <Link href={`/${locale}/recipes/${recipe.id}/audit`}>
                <Button variant="ghost">Audit</Button>
              </Link>
            </>
          ) : null}
          {permissions.has(ARCHIVE_RECIPES) ? <ArchiveDialog recipeId={recipe.id} status={recipe.status} /> : null}
        </div>
      </div>

      {!canEdit ? (
        <div className="rounded-md border border-accent bg-accent/25 px-4 py-3 text-sm font-semibold text-secondary">
          Read-only recipe. You can view the details but cannot edit them.
        </div>
      ) : null}
      <div className="rounded-md border bg-surface p-5">
        <RecipeForm recipe={recipe} categories={categories} canEdit={canEdit} />
      </div>
      <IngredientEditor recipeId={recipe.id} version={recipe.version} ingredients={recipe.ingredients} canEdit={canEdit} />
      <StepEditor recipeId={recipe.id} version={recipe.version} steps={recipe.steps} canEdit={canEdit} />
      {permissions.has(PUBLISH_RECIPES) ? <PublishButton recipeId={recipe.id} version={recipe.version} /> : null}
      {permissions.has(MANAGE_RECIPE_SCOPE) ? (
        <ScopeAssignmentPanel recipeId={recipe.id} assignments={recipe.assignments} />
      ) : null}
    </section>
  );
}
