"use client";

import { Globe } from "lucide-react";
import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { updateLanguagePreference } from "@/features/auth/actions";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === "ar" ? "en" : "ar";
  const [, startTransition] = useTransition();

  function switchLanguage() {
    const nextPath = pathname.replace(/^\/(ar|en)/, `/${nextLocale}`);
    startTransition(async () => {
      await updateLanguagePreference(nextLocale);
      router.push(nextPath);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
      title={nextLocale.toUpperCase()}
      aria-label={nextLocale.toUpperCase()}
    >
      <Globe className="h-4 w-4" />
    </button>
  );
}
