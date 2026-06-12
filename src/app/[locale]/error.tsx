"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export default function ErrorPage() {
  const locale = useLocale();
  const t = useTranslations("errors");
  const common = useTranslations("common");

  return (
    <main className="logical-container py-16">
      <h1 className="text-3xl font-bold">{t("unexpectedTitle")}</h1>
      <p className="mt-2 text-secondary">{t("unexpectedMessage")}</p>
      <Link className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white" href={`/${locale}/dashboard`}>
        {common("returnToDashboard")}
      </Link>
    </main>
  );
}
