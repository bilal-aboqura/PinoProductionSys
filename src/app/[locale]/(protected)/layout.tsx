import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/layout/ProtectedShell";
import { getServerSession } from "@/lib/auth";
import type { FastNavUser } from "@/lib/fast-nav";

export default async function ProtectedLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let session;
  try {
    session = await getServerSession();
  } catch {
    redirect(`/${locale}/login`);
  }

  const user: FastNavUser = {
    id: session.user.id,
    displayName: session.user.displayName,
    role: session.user.role,
    roleDisplayName: session.user.roleDisplayName,
    permissions: session.user.permissions
  };

  return <ProtectedShell locale={locale} user={user}>{children}</ProtectedShell>;
}
