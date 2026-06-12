import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFoundPage({ params }: { params?: Promise<{ locale?: string }> }) {
  const resolved = params ? await params : {};
  const locale = resolved.locale ?? "ar";
  const t = await getTranslations("errors");
  const common = await getTranslations("common");

  return (
    <main className="logical-container py-16">
      <h1 className="text-3xl font-bold">{t("notFoundTitle")}</h1>
      <Link className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white" href={`/${locale}/dashboard`}>
        {common("returnToDashboard")}
      </Link>
    </main>
  );
}
