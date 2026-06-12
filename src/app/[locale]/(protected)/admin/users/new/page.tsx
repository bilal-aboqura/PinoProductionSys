import { getTranslations } from "next-intl/server";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserForm } from "@/features/users/components/UserForm";
import { getRoleOptions } from "@/features/users/queries";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";

export default async function NewUserPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  try {
    requirePermission(session, "users:create");
  } catch {
    return <AccessDenied locale={locale} />;
  }

  const t = await getTranslations("users");
  const roles = await getRoleOptions();

  return (
    <section className="logical-container py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("addUser")}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm mode="create" roles={roles} />
        </CardContent>
      </Card>
    </section>
  );
}
