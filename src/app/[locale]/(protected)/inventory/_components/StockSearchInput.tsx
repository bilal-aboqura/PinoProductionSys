"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useKeyboardScanner } from "@/hooks/useKeyboardScanner";

export function StockSearchInput({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const applySearch = useCallback(
    (nextValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextValue.trim()) params.set("search", nextValue.trim());
      else params.delete("search");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useKeyboardScanner({
    onScan: (scanned) => {
      setValue(scanned);
      applySearch(scanned);
    }
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      applySearch(value);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [applySearch, value]);

  return (
    <label className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
      <Search className="h-4 w-4 text-muted" />
      <input className="min-w-0 flex-1 outline-none" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search stock by item code or name" />
    </label>
  );
}
