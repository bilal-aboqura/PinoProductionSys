"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/actions";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useKeyboardScanner } from "@/hooks/useKeyboardScanner";
import type { FastNavUser } from "@/lib/fast-nav";

const labels = {
  en: {
    appName: "Pino Production System",
    dashboard: "Dashboard",
    production: "Production",
    inventory: "Inventory",
    recipes: "Recipes",
    reports: "Reports",
    users: "Users",
    audit: "Audit Log",
    alertRules: "Alert Rules",
    logout: "Log out"
  },
  ar: {
    appName: "نظام إنتاج بينو",
    dashboard: "لوحة التحكم",
    production: "الإنتاج",
    inventory: "المخزون",
    recipes: "الوصفات",
    reports: "التقارير",
    users: "المستخدمون",
    audit: "سجل التدقيق",
    logout: "تسجيل الخروج"
  }
};

export function AppNav({ locale, user }: { locale: string; user: FastNavUser }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const text = locale === "en" ? labels.en : labels.ar;
  const permissions = new Set(user.permissions);
  const handleScan = useCallback(
    (value: string) => {
      const scanned = value.trim();
      if (/^https?:\/\//i.test(scanned)) {
        window.location.href = scanned;
        return;
      }
      if (/^B[-_]/i.test(scanned)) {
        router.push(`/${locale}/inventory/batches/${encodeURIComponent(scanned)}`);
        return;
      }
      router.push(`/${locale}/inventory?search=${encodeURIComponent(scanned)}`);
    },
    [locale, router]
  );

  useKeyboardScanner({ onScan: handleScan });

  const linkClass = "rounded-md px-3 py-2 text-sm font-semibold text-secondary hover:bg-accent/45";

  return (
    <header className="border-b bg-white">
      <div className="logical-container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/dashboard`} className="font-bold text-primary">
            {text.appName}
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <Link className={linkClass} href={`/${locale}/dashboard`}>
              {text.dashboard}
            </Link>
            {permissions.has("production-orders:view") || permissions.has("production-orders:view_all") || permissions.has("production:view") ? (
              <Link className={linkClass} href={`/${locale}/production`}>
                {text.production}
              </Link>
            ) : null}
            {permissions.has("inventory:view") ? (
              <>
                <Link className={linkClass} href={`/${locale}/inventory`}>
                  {text.inventory}
                </Link>
                <Link className={linkClass} href={`/${locale}/inventory/items`}>
                  Catalog
                </Link>
                {permissions.has("inventory:manage") ? (
                  <Link className={linkClass} href={`/${locale}/inventory/warehouses`}>
                    Warehouses
                  </Link>
                ) : null}
                <Link className={linkClass} href={`/${locale}/inventory/history`}>
                  History
                </Link>
                <Link className={linkClass} href={`/${locale}/inventory/batches`}>
                  Batches
                </Link>
              </>
            ) : null}
            {permissions.has("recipes:view") ? (
              <Link className={linkClass} href={`/${locale}/recipes`}>
                {text.recipes}
              </Link>
            ) : null}
            {permissions.has("reports:view") ? (
              <Link className={linkClass} href={`/${locale}/reports`}>
                {text.reports}
              </Link>
            ) : null}
            {permissions.has("printing:view") || permissions.has("printing:create") || permissions.has("printing:reprint") || permissions.has("system:configure") ? (
              <Link className={linkClass} href={`/${locale}/printing`}>
                Printing
              </Link>
            ) : null}
            {permissions.has("users:view") ? (
              <Link className={linkClass} href={`/${locale}/admin/users`}>
                {text.users}
              </Link>
            ) : null}
            {permissions.has("audit:view") ? (
              <Link className={linkClass} href={`/${locale}/admin/audit`}>
                {text.audit}
              </Link>
            ) : null}
            {permissions.has("notifications:manage_rules") || permissions.has("system:configure") ? (
              <Link className={linkClass} href={`/${locale}/admin/alert-rules`}>
                Alert Rules
              </Link>
            ) : null}
            {permissions.has("settings:view") || permissions.has("system:configure") ? (
              <Link className={linkClass} href={`/${locale}/admin/settings`}>
                Settings
              </Link>
            ) : null}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell locale={locale} />
          <LanguageSwitcher />
          <Link href={`/${locale}/profile/notifications`} className="text-sm font-semibold text-secondary hover:text-primary">
            {user.displayName}
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
            title={text.logout}
            aria-label={text.logout}
            onClick={() =>
              startTransition(async () => {
                window.localStorage.removeItem("pino_nav");
                await logout(locale);
              })
            }
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
