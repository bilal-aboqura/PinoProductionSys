import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordModal } from "@/features/users/components/ResetPasswordModal";
import { UserForm } from "@/features/users/components/UserForm";
import { getRoleOptions, getScopeOptions, getUserById, toUserSummary } from "@/features/users/queries";
import { ScopeSelector } from "@/features/scopes/components/ScopeSelector";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export default async function EditUserPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await getServerSession();
  try {
    requirePermission(session, "users:view");
  } catch {
    return <AccessDenied locale={locale} />;
  }

  const user = await getUserById(id);
  if (!user) {
    notFound();
  }

  const summary = toUserSummary(user);
  const [roles, scopeOptions, t] = await Promise.all([getRoleOptions(), getScopeOptions(), getTranslations("users")]);
  const canEdit = session.user.permissions.includes("users:edit");

  return (
    <section className="logical-container space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserForm mode="edit" roles={roles} user={summary} />
          {canEdit ? <ResetPasswordModal userId={summary.id} /> : null}
        </CardContent>
      </Card>
      {canEdit ? <ScopeSelector userId={summary.id} initial={summary.scopes} options={scopeOptions} /> : null}
    </section>
  );
}
