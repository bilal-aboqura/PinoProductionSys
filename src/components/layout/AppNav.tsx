import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { logout } from "@/features/auth/actions";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { getServerSession } from "@/lib/auth";

export async function AppNav({ locale }: { locale: string }) {
  const t = await getTranslations("navigation");
  const common = await getTranslations("common");
  const auth = await getTranslations("auth");
  const session = await getServerSession();

  const linkClass = "rounded-md px-3 py-2 text-sm font-semibold text-secondary hover:bg-accent/45";

  return (
    <header className="border-b bg-white">
      <div className="logical-container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/dashboard`} className="font-bold text-primary">
            {common("appName")}
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <Link className={linkClass} href={`/${locale}/dashboard`}>
              {t("dashboard")}
            </Link>
            <PermissionGate permission="production:view">
              <Link className={linkClass} href={`/${locale}/production`}>
                {t("production")}
              </Link>
            </PermissionGate>
            <PermissionGate permission="inventory:view">
              <Link className={linkClass} href={`/${locale}/inventory`}>
                {t("inventory")}
              </Link>
            </PermissionGate>
            <PermissionGate permission="recipes:view">
              <Link className={linkClass} href={`/${locale}/recipes`}>
                Recipes
              </Link>
            </PermissionGate>
            <PermissionGate permission="reports:view">
              <Link className={linkClass} href={`/${locale}/reports`}>
                {t("reports")}
              </Link>
            </PermissionGate>
            <PermissionGate permission="users:view">
              <Link className={linkClass} href={`/${locale}/admin/users`}>
                {t("users")}
              </Link>
            </PermissionGate>
            <PermissionGate permission="audit:view">
              <Link className={linkClass} href={`/${locale}/admin/audit`}>
                {t("audit")}
              </Link>
            </PermissionGate>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <span className="text-sm font-semibold text-secondary">{session.user.displayName}</span>
          <form
            action={async () => {
              "use server";
              await logout(locale);
            }}
          >
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
              title={auth("logout")}
              aria-label={auth("logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
