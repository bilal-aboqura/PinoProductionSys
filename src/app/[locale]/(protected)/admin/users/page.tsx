import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/Pagination";
import { UserTable } from "@/features/users/components/UserTable";
import { getUserList } from "@/features/users/queries";
import { parsePage } from "@/lib/pagination";

export default async function UsersPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;

  const t = await getTranslations("users");
  const result = await getUserList({ search: search.q, page: parsePage(search.page) });

  return (
    <section className="logical-container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Link href={`/${locale}/admin/users/new`}>
          <Button>{t("addUser")}</Button>
        </Link>
      </div>
      <UserTable users={result.users} locale={locale} />
      <div className="mt-4">
        <Pagination
          pathname={`/${locale}/admin/users`}
          page={result.page}
          totalPages={result.totalPages}
          totalItems={result.total}
          searchParams={search}
          itemLabel="users"
        />
      </div>
    </section>
  );
}
