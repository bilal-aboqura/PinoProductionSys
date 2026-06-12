"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser, updateUser, assignUserRole } from "@/features/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserSummary } from "@/features/users/types";

const schema = z.object({
  displayName: z.string().min(2),
  username: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal("")),
  roleId: z.string().min(1).optional()
});

type FormValues = z.infer<typeof schema>;

export function UserForm({
  mode,
  roles,
  user
}: {
  mode: "create" | "edit";
  roles: { id: string; name: string; displayName: string }[];
  user?: UserSummary;
}) {
  const t = useTranslations("users");
  const locale = useLocale();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      roleId: user?.role?.id ?? roles[0]?.id
    }
  });

  function onSubmit(values: FormValues) {
    setMessage(null);
    startTransition(async () => {
      if (mode === "create") {
        const result = await createUser({
          displayName: values.displayName,
          username: values.username ?? "",
          email: values.email,
          roleId: values.roleId ?? ""
        });
        if (result.success) {
          setTemporaryPassword(result.temporaryPassword);
          router.refresh();
        } else {
          setMessage(result.error);
        }
        return;
      }

      if (!user) return;
      const result = await updateUser(user.id, { displayName: values.displayName, email: values.email || null });
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      if (values.roleId && values.roleId !== user.role?.id) {
        const roleResult = await assignUserRole(user.id, values.roleId);
        if (!roleResult.success) {
          setMessage(roleResult.error);
          return;
        }
      }
      setMessage(t("save"));
      router.refresh();
    });
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">{t("displayName")}</Label>
          <Input id="displayName" {...form.register("displayName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">{t("username")}</Label>
          <Input id="username" disabled={mode === "edit"} {...form.register("username")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roleId">{t("role")}</Label>
          <select id="roleId" className="h-10 w-full rounded-md border bg-white px-3 text-sm" {...form.register("roleId")}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>
      {message ? <p className="text-sm font-semibold text-error">{message}</p> : null}
      {temporaryPassword ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
          <p className="text-sm font-semibold">{t("oneTimePassword")}</p>
          <code className="mt-2 block text-lg font-bold">{temporaryPassword}</code>
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {t("save")}
      </Button>
      {mode === "create" && temporaryPassword ? (
        <Button type="button" variant="secondary" onClick={() => router.push(`/${locale}/admin/users`)}>
          {t("title")}
        </Button>
      ) : null}
    </form>
  );
}
