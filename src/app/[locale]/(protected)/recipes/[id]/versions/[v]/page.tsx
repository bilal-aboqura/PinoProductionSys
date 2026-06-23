import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Badge } from "@/components/ui/badge";
import { getRecipeVersion } from "@/features/recipes/actions";

export default async function RecipeVersionDetailPage({
  params
}: {
  params: Promise<{ locale: string; id: string; v: string }>;
}) {
  const { locale, id, v } = await params;
  const result = await getRecipeVersion(id, Number(v));
  if (!result.success) {
    if (result.code === "UNAUTHORIZED") return <AccessDenied locale={locale} />;
    notFound();
  }
  const snapshot = result.data.snapshot;
  return (
    <section className="logical-container space-y-6 py-8">
      <Link className="text-sm font-semibold text-primary" href={`/${locale}/recipes/${id}/versions`}>
        Back to versions
      </Link>
      <div className="rounded-md border border-warning bg-warning/15 px-4 py-3 font-semibold text-secondary">
        Read-Only - Version v{result.data.versionNumber}
      </div>
      <div className="grid gap-3 rounded-md border bg-accent/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><b>Total cost:</b> {snapshot.calculations.totalCost} {snapshot.calculations.currency}</div>
        <div><b>Total calories:</b> {snapshot.calculations.totalCalories} kcal</div>
        <div><b>Cost / yield:</b> {snapshot.calculations.costPerYieldUnit ?? "â€”"}</div>
        <div><b>Calories / serving:</b> {snapshot.calculations.caloriesPerServing ?? "â€”"}</div>
        <div><b>Selling price:</b> {snapshot.calculations.sellingPriceSnapshot ?? "â€”"}</div>
        <div><b>Profit:</b> {snapshot.calculations.profitAmountSnapshot ?? "â€”"}</div>
        <div><b>Margin:</b> {snapshot.calculations.profitMarginSnapshot ? `${snapshot.calculations.profitMarginSnapshot}%` : "â€”"}</div>
      </div>
      <div>
        <h1 className="font-cairo text-3xl font-bold">{snapshot.nameAr}</h1>
        <p className="font-inter text-secondary">{snapshot.nameEn}</p>
      </div>
      <div className="grid gap-4 rounded-md border bg-surface p-5 md:grid-cols-2">
        <div><b>Code:</b> {snapshot.code}</div>
        <div><b>Category:</b> {snapshot.categoryNameEn} / {snapshot.categoryNameAr}</div>
        <div><b>Yield:</b> {snapshot.yieldQuantity} {snapshot.yieldUnit}</div>
        <div><b>Shelf Life:</b> {snapshot.shelfLifeValue} {snapshot.shelfLifeUnit}</div>
        <div><b>Storage:</b> {snapshot.storageMethod}</div>
        <div><b>Published:</b> {new Date(snapshot.publishedAt).toLocaleString()}</div>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-bold">Ingredients</h2>
        <div className="space-y-2">
          {snapshot.ingredients.map((ingredient) => (
            <div key={ingredient.id} className="rounded-md border bg-surface p-3">
              {ingredient.inventoryItemNameEn} <Badge>{ingredient.quantity} {ingredient.unit}</Badge>
              <span className="ms-3 text-sm text-secondary">{ingredient.lineCost} SAR Â· {ingredient.lineCalories} kcal</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Steps</h2>
        <div className="space-y-2">
          {snapshot.steps.map((step) => (
            <div key={step.id} className="rounded-md border bg-surface p-3">
              <h3 className="font-semibold">{step.stepNumber}. {step.title}</h3>
              <p className="mt-2 text-sm text-secondary">{step.instructions}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
