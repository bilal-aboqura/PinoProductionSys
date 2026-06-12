import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Button } from "@/components/ui/button";
import { UserTable } from "@/features/users/components/UserTable";
import { getUserList } from "@/features/users/queries";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export default async function UsersPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;
  const session = await getServerSession();
  try {
    requirePermission(session, "users:view");
  } catch {
    return <AccessDenied locale={locale} />;
  }

  const t = await getTranslations("users");
  const result = await getUserList({ search: search.q, page: Number(search.page ?? 1) });

  return (
    <section className="logical-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Link href={`/${locale}/admin/users/new`}>
          <Button>{t("addUser")}</Button>
        </Link>
      </div>
      <UserTable users={result.users} locale={locale} />
    </section>
  );
}
