import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { AuditLogTable } from "@/features/audit/components/AuditLogTable";
import { getAuditLogs } from "@/features/audit/actions";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export default async function AuditPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ username?: string; from?: string; to?: string; page?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  const session = await getServerSession();
  try {
    requirePermission(session, "audit:view");
  } catch {
    return <AccessDenied locale={locale} />;
  }

  const t = await getTranslations("audit");
  const result = await getAuditLogs({
    targetUsername: search.username,
    fromDate: search.from ? new Date(search.from) : undefined,
    toDate: search.to ? new Date(search.to) : undefined,
    page: Number(search.page ?? 1)
  });

  return (
    <section className="logical-container py-8">
      <h1 className="mb-6 text-3xl font-bold">{t("title")}</h1>
      <form className="mb-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
        <input className="h-10 rounded-md border px-3 text-sm" name="username" placeholder={t("usernameSearch")} defaultValue={search.username} />
        <input className="h-10 rounded-md border px-3 text-sm" name="from" type="date" defaultValue={search.from} aria-label={t("fromDate")} />
        <input className="h-10 rounded-md border px-3 text-sm" name="to" type="date" defaultValue={search.to} aria-label={t("toDate")} />
        <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white" type="submit">
          {t("usernameSearch")}
        </button>
      </form>
      <AuditLogTable logs={result.data.logs} locale={locale} />
    </section>
  );
}
