import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export default async function ProductionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  try {
    requirePermission(session, "production:view");
  } catch {
    return <AccessDenied locale={locale} />;
  }
  const t = await getTranslations("navigation");
  const common = await getTranslations("common");
  return (
    <section className="logical-container py-8">
      <h1 className="text-3xl font-bold">{t("production")}</h1>
      <p className="mt-2 text-secondary">{common("comingSoon")}</p>
    </section>
  );
}
