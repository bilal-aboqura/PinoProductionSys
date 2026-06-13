"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { login } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "");
    const password = String(formData.get("password") ?? "");
    setError(null);
    startTransition(async () => {
      const result = await login({ identifier, password });
      if (result.success) {
        window.localStorage.setItem("pino_nav", JSON.stringify(result.user));
        router.push(`/${locale}${result.redirectTo}`);
        return;
      }

      if (result.error === "ACCOUNT_INACTIVE") {
        setError(t("accountInactive"));
      } else if (result.error === "DATABASE_UNAVAILABLE") {
        setError(t("databaseUnavailable"));
      } else {
        setError(t("invalidCredentials"));
      }
    });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="identifier">{t("identifierLabel")}</Label>
        <Input id="identifier" name="identifier" autoComplete="username" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error ? <p className="text-sm font-semibold text-error">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {t("loginButton")}
      </Button>
    </form>
  );
}
