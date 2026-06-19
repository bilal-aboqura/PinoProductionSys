import { AppNav } from "@/components/layout/AppNav";
import type { FastNavUser } from "@/lib/fast-nav";

export function ProtectedShell({
  locale,
  user,
  children
}: {
  locale: string;
  user: FastNavUser;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppNav locale={locale} user={user} />
      <main className="min-w-0 lg:ps-72">{children}</main>
    </div>
  );
}
