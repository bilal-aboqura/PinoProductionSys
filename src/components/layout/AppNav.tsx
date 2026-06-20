"use client";

import Link from "next/link";
import {
  BarChart3,
  BellRing,
  BookOpen,
  Boxes,
  Factory,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackageSearch,
  Printer,
  ScrollText,
  Settings,
  Users,
  Warehouse,
  X
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/features/auth/actions";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useKeyboardScanner } from "@/hooks/useKeyboardScanner";
import type { FastNavUser } from "@/lib/fast-nav";

export function AppNav({ locale, user }: { locale: string; user: FastNavUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useTranslations("navigation");
  const common = useTranslations("common");
  const auth = useTranslations("auth");
  const [open, setOpen] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [, startTransition] = useTransition();
  const permissions = new Set(user.permissions);

  useEffect(() => setOpen(false), [pathname]);

  const handleScan = useCallback((value: string) => {
    const scanned = value.trim();
    if (/^https?:\/\//i.test(scanned)) return void (window.location.href = scanned);
    if (/^B[-_]/i.test(scanned)) return void router.push(`/${locale}/inventory/batches/${encodeURIComponent(scanned)}`);
    router.push(`/${locale}/inventory?search=${encodeURIComponent(scanned)}`);
  }, [locale, router]);

  useKeyboardScanner({ onScan: handleScan });
  useEffect(() => setScannerReady(true), []);

  const canViewProduction = permissions.has("production-orders:view") || permissions.has("production-orders:view_all") || permissions.has("production:view");
  const canViewPrinting = permissions.has("printing:view") || permissions.has("printing:create") || permissions.has("printing:reprint") || permissions.has("system:configure");
  const items = [
    { href: `/${locale}/dashboard`, label: navigation("dashboard"), icon: LayoutDashboard, show: true, exact: true },
    { href: `/${locale}/production`, label: navigation("production"), icon: Factory, show: canViewProduction },
    { href: `/${locale}/inventory`, label: navigation("inventory"), icon: Boxes, show: permissions.has("inventory:view"), exact: true },
    { href: `/${locale}/inventory/items`, label: navigation("catalog"), icon: PackageSearch, show: permissions.has("inventory:view") },
    { href: `/${locale}/inventory/warehouses`, label: navigation("warehouses"), icon: Warehouse, show: permissions.has("inventory:manage") },
    { href: `/${locale}/inventory/history`, label: navigation("history"), icon: History, show: permissions.has("inventory:view") },
    { href: `/${locale}/inventory/batches`, label: navigation("batches"), icon: Package, show: permissions.has("inventory:view") },
    { href: `/${locale}/recipes`, label: navigation("recipes"), icon: BookOpen, show: permissions.has("recipes:view") },
    { href: `/${locale}/reports`, label: navigation("reports"), icon: BarChart3, show: permissions.has("reports:view") },
    { href: `/${locale}/printing`, label: navigation("printing"), icon: Printer, show: canViewPrinting },
    { href: `/${locale}/admin/users`, label: navigation("users"), icon: Users, show: permissions.has("users:view") },
    { href: `/${locale}/admin/audit`, label: navigation("audit"), icon: ScrollText, show: permissions.has("audit:view") },
    { href: `/${locale}/admin/alert-rules`, label: navigation("alertRules"), icon: BellRing, show: permissions.has("notifications:manage_rules") || permissions.has("system:configure") },
    { href: `/${locale}/admin/settings`, label: navigation("settings"), icon: Settings, show: permissions.has("settings:view") || permissions.has("system:configure") }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white px-4 lg:hidden">
        <Link href={`/${locale}/dashboard`} className="font-bold text-primary">{common("appName")}</Link>
        <div className="flex items-center gap-1">
          <NotificationBell locale={locale} />
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md text-secondary hover:bg-accent/45" onClick={() => setOpen(true)} aria-label={navigation("openMenu")}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open ? <button className="fixed inset-0 z-40 bg-black/35 lg:hidden" type="button" aria-label={navigation("closeMenu")} onClick={() => setOpen(false)} /> : null}
      <aside className="app-sidebar fixed inset-y-0 start-0 z-50 flex w-72 flex-col border-e bg-white shadow-lg transition-transform duration-200 lg:shadow-none" data-open={open} data-scanner-ready={scannerReady}>
        <div className="flex h-20 items-center justify-between border-b px-5">
          <Link href={`/${locale}/dashboard`} className="text-lg font-bold text-primary">{common("appName")}</Link>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-accent/45 lg:hidden" onClick={() => setOpen(false)} aria-label={navigation("closeMenu")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={navigation("mainMenu")}>
          {items.filter((item) => item.show).map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-primary text-white shadow-sm" : "text-secondary hover:bg-accent/45 hover:text-foreground"}`}>
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-accent/20 p-2">
            <Link href={`/${locale}/profile/notifications`} className="min-w-0 text-sm font-semibold text-secondary hover:text-primary">
              <span className="block truncate">{user.displayName}</span>
              <span className="block truncate text-xs font-normal text-muted">{user.roleDisplayName ?? user.role}</span>
            </Link>
            <div className="flex shrink-0 items-center"><NotificationBell locale={locale} /><LanguageSwitcher /></div>
          </div>
          <button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-secondary hover:bg-error/10 hover:text-error" onClick={() => startTransition(async () => { window.localStorage.removeItem("pino_nav"); await logout(locale); })}>
            <LogOut className="h-4 w-4" />{auth("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
