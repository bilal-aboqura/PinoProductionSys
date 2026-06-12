"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "" }
  });

  function onSubmit(values: FormValues) {
    setError(null);
    startTransition(async () => {
      const result = await login(values);
      if (result.success) {
        router.push(`/${locale}${result.redirectTo}`);
        router.refresh();
        return;
      }

      setError(result.error === "ACCOUNT_INACTIVE" ? t("accountInactive") : t("invalidCredentials"));
    });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="identifier">{t("identifierLabel")}</Label>
        <Input id="identifier" autoComplete="username" {...form.register("identifier")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
      </div>
      {error ? <p className="text-sm font-semibold text-error">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {t("loginButton")}
      </Button>
    </form>
  );
}
