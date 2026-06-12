import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function AccessDenied({ locale }: { locale: string }) {
  const t = await getTranslations("errors");
  const common = await getTranslations("common");

  return (
    <section className="logical-container py-16">
      <div className="max-w-xl rounded-lg border bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-error">403</p>
        <h1 className="text-2xl font-bold">{t("accessDeniedTitle")}</h1>
        <p className="mt-3 text-muted">{t("accessDeniedMessage")}</p>
        <Link
          href={`/${locale}/dashboard`}
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {common("returnToDashboard")}
        </Link>
      </div>
    </section>
  );
}
