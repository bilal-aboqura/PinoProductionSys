"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";
import type { FastNavUser } from "@/lib/fast-nav";

function readUser() {
  try {
    const value = window.localStorage.getItem("pino_nav");
    if (!value) return null;
    const parsed = JSON.parse(value) as FastNavUser;
    return parsed.id && parsed.displayName && Array.isArray(parsed.permissions) ? parsed : null;
  } catch {
    return null;
  }
}

export function ProtectedShell({
  locale,
  children
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<FastNavUser | null>(null);

  useEffect(() => {
    const stored = readUser();
    if (!stored) {
      router.replace(`/${locale}/login`);
      return;
    }
    setUser(stored);
  }, [locale, router]);

  if (!user) return null;

  return (
    <>
      <AppNav locale={locale} user={user} />
      <main>{children}</main>
    </>
  );
}
