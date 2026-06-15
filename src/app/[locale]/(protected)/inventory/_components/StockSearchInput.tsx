"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function StockSearchInput({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("search", value.trim());
      else params.delete("search");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [pathname, router, searchParams, value]);

  return (
    <label className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
      <Search className="h-4 w-4 text-muted" />
      <input className="min-w-0 flex-1 outline-none" value={value} onChange={(event) => setValue(event.target.value)} placeholder="Search stock by item code or name" />
    </label>
  );
}
