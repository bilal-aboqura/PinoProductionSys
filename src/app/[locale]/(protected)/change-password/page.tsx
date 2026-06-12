import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { getServerSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ChangePasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (!session.user.mustChangePassword) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("auth");

  return (
    <section className="logical-container py-10">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t("changePasswordTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </section>
  );
}
