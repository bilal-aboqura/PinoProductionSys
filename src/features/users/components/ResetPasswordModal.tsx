"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { KeyRound } from "lucide-react";
import { resetUserPassword } from "@/features/users/actions";
import { Button } from "@/components/ui/button";

export function ResetPasswordModal({ userId }: { userId: string }) {
  const t = useTranslations("users");
  const [password, setPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if (result.success) {
        setPassword(result.temporaryPassword);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="secondary" onClick={reset} disabled={pending}>
        <KeyRound className="h-4 w-4" />
        {t("resetPassword")}
      </Button>
      {password ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-semibold">{t("oneTimePassword")}</p>
          <code className="mt-2 block text-lg font-bold">{password}</code>
        </div>
      ) : null}
    </div>
  );
}
