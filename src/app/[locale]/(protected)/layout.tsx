import { redirect } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";
import { getServerSession } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  try {
    await getServerSession();
  } catch {
    redirect(`/${locale}/login`);
  }

  return (
    <>
      <AppNav locale={locale} />
      <main>{children}</main>
    </>
  );
}
