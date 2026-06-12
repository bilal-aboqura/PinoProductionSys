import { AccessDenied } from "@/components/shared/AccessDenied";
import { CategoryForm } from "@/components/recipes/categories/CategoryForm";
import { getServerSession } from "@/lib/auth";
import { MANAGE_RECIPE_CATEGORIES, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function RecipeCategoryFormPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getServerSession();
  try {
    requirePermission(session, MANAGE_RECIPE_CATEGORIES);
  } catch {
    return <AccessDenied locale={locale} />;
  }

  const category =
    id === "new"
      ? undefined
      : await prisma.recipeCategory.findUnique({ where: { id } }).then((item) =>
          item
            ? {
                id: item.id,
                nameAr: item.nameAr || item.name,
                nameEn: item.nameEn || item.name,
                description: item.description,
                isActive: item.isActive,
                sortOrder: item.sortOrder
              }
            : undefined
        );

  return (
    <section className="logical-container py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-secondary">Recipes / Categories</p>
        <h1 className="text-3xl font-bold">{category ? "Edit Category" : "New Category"}</h1>
      </div>
      <div className="rounded-md border bg-surface p-5">
        <CategoryForm category={category} locale={locale} />
      </div>
    </section>
  );
}

