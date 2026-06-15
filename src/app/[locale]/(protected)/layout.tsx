import { ProtectedShell } from "@/components/layout/ProtectedShell";

export default async function ProtectedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <ProtectedShell locale={locale}>{children}</ProtectedShell>;
}
