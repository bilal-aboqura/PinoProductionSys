import Link from "next/link";
import { pageHref, type SearchParams } from "@/lib/pagination";

type PaginationProps = {
  pathname: string;
  page: number;
  totalPages: number;
  totalItems: number;
  searchParams?: SearchParams;
  itemLabel?: string;
};

export function Pagination({
  pathname,
  page,
  totalPages,
  totalItems,
  searchParams = {},
  itemLabel = "items"
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const linkClass = "rounded-md border bg-white px-3 py-2 text-sm font-semibold text-secondary hover:bg-accent/35";
  const disabledClass = "cursor-not-allowed rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted opacity-60";

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-secondary">
        {totalItems.toLocaleString()} {itemLabel} · Page {safePage.toLocaleString()} of {safeTotalPages.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        {safePage > 1 ? (
          <Link className={linkClass} href={pageHref(pathname, safePage - 1, searchParams)} rel="prev">
            Previous
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">Previous</span>
        )}
        {safePage < safeTotalPages ? (
          <Link className={linkClass} href={pageHref(pathname, safePage + 1, searchParams)} rel="next">
            Next
          </Link>
        ) : (
          <span className={disabledClass} aria-disabled="true">Next</span>
        )}
      </div>
    </nav>
  );
}
