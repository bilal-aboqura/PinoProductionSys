import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { createRecipe } from "@/features/recipes/actions";

export default async function NewRecipePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const result = await createRecipe({ nameAr: "Untitled recipe" });
  if (!result.success) return <AccessDenied locale={locale} />;
  redirect(`/${locale}/recipes/${result.data.id}`);
}

