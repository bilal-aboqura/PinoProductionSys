"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InventoryBalanceImportError } from "@/features/inventory/inventory-balance-excel";

const copy = {
  en: {
    title: "Inventory Excel Import / Export",
    description: "Download a stock-count template, enter the counted quantities, then import it to create inventory adjustments.",
    exportTemplate: "Export Inventory Template",
    importExcel: "Import Inventory",
    importing: "Validating and importing...",
    success: (imported: number, skipped: number) => `${imported} adjustment row${imported === 1 ? "" : "s"} imported; ${skipped} unchanged row${skipped === 1 ? "" : "s"} skipped.`,
    invalidFile: "Choose an .xlsx file that is 5 MB or smaller.",
    failed: "The Excel file could not be imported.",
    errorsTitle: "Import errors",
    errorsDescription: "Nothing was saved. Correct these rows and import the file again.",
    row: "Row",
    column: "Column",
    error: "Error"
  },
  ar: {
    title: "استيراد / تصدير Excel للمخزون",
    description: "نزّل قالب الجرد، اكتب الكميات المعدودة، ثم استورده لإنشاء تسويات مخزون.",
    exportTemplate: "تصدير قالب المخزون",
    importExcel: "استيراد المخزون",
    importing: "جاري التحقق والاستيراد...",
    success: (imported: number, skipped: number) => `تم استيراد ${imported} صف تسوية وتخطي ${skipped} صف بدون تغيير.`,
    invalidFile: "اختر ملف .xlsx بحجم 5 ميجابايت أو أقل.",
    failed: "تعذر استيراد ملف Excel.",
    errorsTitle: "أخطاء الاستيراد",
    errorsDescription: "لم يتم حفظ أي بيانات. صحح الصفوف التالية ثم أعد الاستيراد.",
    row: "الصف",
    column: "العمود",
    error: "الخطأ"
  }
} as const;

export function InventoryExcelActions({ canAdjust }: { canAdjust: boolean }) {
  const locale = useLocale();
  const labels = locale === "ar" ? copy.ar : copy.en;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<InventoryBalanceImportError[]>([]);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!canAdjust) return null;

  async function importFile(file: File) {
    setErrors([]);
    setMessage("");
    setIsSuccess(false);
    if (!file.name.toLocaleLowerCase().endsWith(".xlsx") || file.size > 5 * 1024 * 1024) {
      setMessage(labels.invalidFile);
      return;
    }
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/inventory/excel", { method: "POST", body: formData });
      const result = await response.json() as { success?: boolean; importedRowCount?: number; skippedRowCount?: number; errors?: InventoryBalanceImportError[]; error?: string };
      if (response.ok && result.success) {
        setIsSuccess(true);
        setMessage(labels.success(result.importedRowCount ?? 0, result.skippedRowCount ?? 0));
        router.refresh();
      } else if (result.errors?.length) {
        setErrors(result.errors);
      } else setMessage(result.error ?? labels.failed);
    } catch {
      setMessage(labels.failed);
    } finally {
      setIsImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-5" aria-labelledby="inventory-excel-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-bold" id="inventory-excel-title">{labels.title}</h2>
            <p className="mt-1 text-sm text-secondary">{labels.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
            download
            href={`/api/inventory/excel?locale=${locale}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {labels.exportTemplate}
          </a>
          <Button disabled={isImporting} onClick={() => inputRef.current?.click()}>
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {isImporting ? labels.importing : labels.importExcel}
          </Button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
        </div>
      </div>

      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm font-semibold ${isSuccess ? "bg-success/10 text-success" : "bg-error/10 text-error"}`} role="status">
          {message}
        </p>
      ) : null}

      {errors.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-md border border-error/30" role="alert">
          <div className="bg-error/10 px-4 py-3">
            <h3 className="font-bold text-error">{labels.errorsTitle}</h3>
            <p className="mt-1 text-sm text-secondary">{labels.errorsDescription}</p>
          </div>
          <div className="max-h-72 overflow-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="sticky top-0 bg-white text-start text-secondary shadow-sm">
                <tr>
                  <th className="px-4 py-2 text-start font-semibold">{labels.row}</th>
                  <th className="px-4 py-2 text-start font-semibold">{labels.column}</th>
                  <th className="px-4 py-2 text-start font-semibold">{labels.error}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {errors.map((error, index) => (
                  <tr key={`${error.row}-${error.column}-${index}`}>
                    <td className="px-4 py-2 font-semibold">{error.row || "-"}</td>
                    <td className="px-4 py-2">{error.column}</td>
                    <td className="px-4 py-2 text-error">{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
