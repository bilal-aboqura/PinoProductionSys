"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Download, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportColumn, ReportFilters, ReportRow, ReportType } from "@/features/reports/types";

export function ReportTable({
  locale,
  reportType,
  rows,
  columns,
  totalCount,
  page,
  totalPages,
  filters = {}
}: {
  locale: string;
  reportType: ReportType;
  rows: ReportRow[];
  columns: ReportColumn[];
  totalCount: number;
  page: number;
  totalPages: number;
  filters?: ReportFilters;
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const a = String(left[sortKey] ?? "");
      const b = String(right[sortKey] ?? "");
      return sortDirection === "asc" ? a.localeCompare(b, undefined, { numeric: true }) : b.localeCompare(a, undefined, { numeric: true });
    });
  }, [rows, sortDirection, sortKey]);

  function toggleSort(key: string) {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  const filterParam = encodeURIComponent(JSON.stringify(filters));
  const excelUrl = `/api/reports/export?format=excel&reportType=${reportType}&filters=${filterParam}`;
  const pdfUrl = `/api/reports/export?format=pdf&reportType=${reportType}&filters=${filterParam}`;

  return (
    <div className="rounded-md border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="text-base font-semibold">{labelForReport(reportType)}</h2>
          <p className="text-sm text-muted">
            {totalCount} rows - page {page} of {totalPages}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex h-9 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-semibold text-white hover:bg-secondary/90" href={excelUrl}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Excel
          </a>
          <a className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary/90" href={pdfUrl}>
            <FileText className="h-4 w-4" aria-hidden="true" />
            PDF
          </a>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.align === "right" ? "text-end" : undefined}>
                  <button className="inline-flex items-center gap-1 text-inherit" type="button" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </TableHead>
              ))}
              <TableHead className="w-12 text-end" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted" colSpan={columns.length + 1}>
                  No report rows found.
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row, index) => (
                <TableRow key={String(row.id ?? index)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.align === "right" ? "text-end tabular-nums" : undefined}>
                      {column.key === "status" || column.key === "reason" ? <Badge>{String(row[column.key] ?? "")}</Badge> : formatCell(row[column.key])}
                    </TableCell>
                  ))}
                  <TableCell className="text-end">{drillDownLink(locale, reportType, row)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function labelForReport(reportType: ReportType) {
  return reportType
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function formatCell(value: ReportRow[string]) {
  if (value == null) return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

function drillDownLink(locale: string, reportType: ReportType, row: ReportRow) {
  let href = "";
  if (reportType.startsWith("PRODUCTION") && row.id) href = `/${locale}/production/${row.id}`;
  if ((reportType.includes("BATCH") || reportType === "ACTIVE_BATCHES" || reportType === "EXPIRED_BATCHES" || reportType === "NEAR_EXPIRY") && row.batchNumber) {
    href = `/${locale}/inventory/batches/${row.batchNumber}`;
  }
  if (reportType.startsWith("INVENTORY") || reportType.startsWith("WAREHOUSE") || reportType === "LOW_STOCK") href = `/${locale}/inventory/history`;
  if (!href) return null;
  return (
    <Link className="inline-flex items-center justify-center rounded-sm p-1 text-primary hover:bg-accent/45" href={href} title="Open detail">
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
