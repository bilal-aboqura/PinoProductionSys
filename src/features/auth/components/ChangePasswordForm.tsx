"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePassword } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
    confirmPassword: z.string().min(1)
  })
  .refine((data) => data.newPassword === data.confirmPassword, { path: ["confirmPassword"] });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const t = useTranslations("auth");
  const validation = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" }
  });

  function onSubmit(values: FormValues) {
    setError(null);
    startTransition(async () => {
      const result = await changePassword(values);
      if (result.success) {
        router.push(`/${locale}/dashboard`);
        router.refresh();
        return;
      }

      setError(result.error === "WRONG_CURRENT_PASSWORD" ? t("wrongCurrentPassword") : validation("passwordStrength"));
    });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input id="currentPassword" type="password" autoComplete="current-password" {...form.register("currentPassword")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input id="newPassword" type="password" autoComplete="new-password" {...form.register("newPassword")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
      </div>
      {error ? <p className="text-sm font-semibold text-error">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {t("changePasswordButton")}
      </Button>
    </form>
  );
}
