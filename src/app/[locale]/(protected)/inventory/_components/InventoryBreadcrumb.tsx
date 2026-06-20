import Link from "next/link";
import { useTranslations } from "next-intl";

export function InventoryBreadcrumb({ locale, current }: { locale: string; current: string }) {
  const t = useTranslations("workspace");
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
      <Link className="font-semibold text-secondary hover:text-primary" href={`/${locale}/inventory`}>
        {t("inventory")}
      </Link>
      <span>/</span>
      <span className="font-semibold text-primary">{current}</span>
    </nav>
  );
}
