"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/layout/AppNav";
import type { FastNavUser } from "@/lib/fast-nav";

function readUser(): FastNavUser | null {
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
  // Read synchronously so the nav renders on the first paint — no hydration flash.
  // `typeof window === "undefined"` guard makes this SSR-safe (returns null on server,
  // then the client initializer runs immediately before the first paint).
  const [user] = [
    typeof window !== "undefined" ? readUser() : null
  ] as [FastNavUser | null];

  useEffect(() => {
    if (!user) {
      router.replace(`/${locale}/login`);
    }
  }, [user, locale, router]);

  if (!user) return null;

  return (
    <>
      <AppNav locale={locale} user={user} />
      <main>{children}</main>
    </>
  );
}
