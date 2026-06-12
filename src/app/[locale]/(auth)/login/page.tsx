import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/features/auth/lib/auth.config";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user?.id) {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("auth");
  const common = await getTranslations("common");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-semibold text-primary">{common("appName")}</p>
          <CardTitle>{t("loginTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
