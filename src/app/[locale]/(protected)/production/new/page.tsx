import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { CreateOrderForm } from "@/components/production-orders/CreateOrderForm";
import { getAssignableStaff, getCreatableRecipeVersions } from "@/features/production-orders/queries";
import { getWarehouses } from "@/features/inventory/queries";

export default async function NewProductionOrderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const [recipes, staff, warehouses] = await Promise.all([getCreatableRecipeVersions(), getAssignableStaff(), getWarehouses()]);
    return (
      <section className="logical-container space-y-6 py-8">
        <div>
          <Link className="text-sm font-semibold text-primary" href={`/${locale}/production`}>
            Back to production
          </Link>
          <h1 className="mt-3 text-3xl font-bold">Create Production Order</h1>
          <p className="mt-2 text-secondary">Create from an active published recipe version.</p>
        </div>
        <CreateOrderForm recipes={recipes} staff={staff} warehouses={warehouses} locale={locale} />
      </section>
    );
  } catch (error) {
    if (error instanceof Error && (error.message === "PERMISSION_DENIED" || error.message === "UNAUTHORIZED")) {
      return <AccessDenied locale={locale} />;
    }
    throw error;
  }
}
