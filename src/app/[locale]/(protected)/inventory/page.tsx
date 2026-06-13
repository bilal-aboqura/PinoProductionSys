import { getTranslations } from "next-intl/server";

export default async function InventoryPage() {
  const t = await getTranslations("navigation");
  const common = await getTranslations("common");
  return (
    <section className="logical-container py-8">
      <h1 className="text-3xl font-bold">{t("inventory")}</h1>
      <p className="mt-2 text-secondary">{common("comingSoon")}</p>
    </section>
  );
}
