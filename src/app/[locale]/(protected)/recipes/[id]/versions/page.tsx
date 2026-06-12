import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { VersionHistoryTable } from "@/components/recipes/VersionHistoryTable";
import { getRecipeVersionHistory } from "@/features/recipes/actions";

export default async function RecipeVersionsPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const result = await getRecipeVersionHistory(id);
  if (!result.success) return <AccessDenied locale={locale} />;

  return (
    <section className="logical-container py-8">
      <Link className="text-sm font-semibold text-primary" href={`/${locale}/recipes/${id}`}>
        Back to recipe
      </Link>
      <h1 className="mb-6 mt-3 text-3xl font-bold">Version History</h1>
      <VersionHistoryTable versions={result.data} locale={locale} recipeId={id} />
    </section>
  );
}

