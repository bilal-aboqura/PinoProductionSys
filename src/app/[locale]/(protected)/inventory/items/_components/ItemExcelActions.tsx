"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ItemReferenceImportError } from "@/features/inventory/item-reference-excel";

const copy = {
  en: {
    title: "Excel Import / Export",
    description: "Download the template to update existing references or create new catalog items with their first reference.",
    exportTemplate: "Export Template",
    importExcel: "Import Excel",
    importing: "Validating and importing…",
    success: (count: number, created: number) => `${count} reference row${count === 1 ? "" : "s"} imported successfully; ${created} new item${created === 1 ? "" : "s"} created.`,
    invalidFile: "Choose an .xlsx file that is 5 MB or smaller.",
    failed: "The Excel file could not be imported.",
    errorsTitle: "Import errors",
    errorsDescription: "Nothing was saved. Correct these rows and import the file again.",
    row: "Row",
    column: "Column",
    error: "Error"
  },
  ar: {
    title: "استيراد / تصدير Excel",
    description: "نزّل القالب لتحديث مراجع الأصناف الموجودة أو إنشاء أصناف جديدة مع أول مرجع لها.",
    exportTemplate: "تصدير القالب",
    importExcel: "استيراد Excel",
    importing: "جارٍ التحقق والاستيراد…",
    success: (count: number, created: number) => `تم استيراد ${count} صف وإنشاء ${created} صنف جديد بنجاح.`,
    invalidFile: "اختر ملف .xlsx بحجم 5 ميجابايت أو أقل.",
    failed: "تعذر استيراد ملف Excel.",
    errorsTitle: "أخطاء الاستيراد",
    errorsDescription: "لم يتم حفظ أي بيانات. صحح الصفوف التالية ثم أعد الاستيراد.",
    row: "الصف",
    column: "العمود",
    error: "الخطأ"
  }
} as const;

const arabicColumns: Record<string, string> = {
  Header: "رؤوس الأعمدة",
  Workbook: "ملف Excel",
  "Item Code": "رمز الصنف",
  "Item Name": "اسم الصنف",
  "Arabic Item Name": "اسم الصنف بالعربية",
  "Item Type": "نوع الصنف",
  Category: "الفئة",
  "Base Unit": "الوحدة الأساسية",
  "Minimum Stock": "الحد الأدنى للمخزون",
  "Reference Quantity": "الكمية المرجعية",
  "Reference Unit": "الوحدة المرجعية",
  Cost: "التكلفة",
  "Cost Currency": "عملة التكلفة",
  Calories: "السعرات",
  "Calorie Reference Quantity": "الكمية المرجعية للسعرات",
  "Calorie Reference Unit": "الوحدة المرجعية للسعرات",
  "Effective Date": "تاريخ السريان"
};

const arabicErrors: Record<string, string> = {
  "The file is not a readable Excel workbook.": "الملف ليس مصنف Excel صالحًا للقراءة.",
  "The workbook does not contain a worksheet.": "لا يحتوي ملف Excel على ورقة عمل.",
  "The workbook does not contain any data rows.": "لا يحتوي ملف Excel على صفوف بيانات.",
  "Item Code is required.": "رمز الصنف مطلوب.",
  "Item Name is required.": "اسم الصنف مطلوب.",
  "Item Type must be RAW_MATERIAL, TRANSFORMATION_MATERIAL, or FINISHED_PRODUCT.": "يجب أن يكون نوع الصنف RAW_MATERIAL أو TRANSFORMATION_MATERIAL أو FINISHED_PRODUCT.",
  "Base Unit is not allowed.": "الوحدة الأساسية غير مسموح بها.",
  "Minimum Stock must be numeric.": "يجب أن يكون الحد الأدنى للمخزون رقمًا.",
  "Minimum Stock must be greater than or equal to 0.": "يجب أن يكون الحد الأدنى للمخزون أكبر من أو يساوي صفرًا.",
  "Reference Quantity must be numeric.": "يجب أن تكون الكمية المرجعية رقمًا.",
  "Reference Quantity must be greater than 0.": "يجب أن تكون الكمية المرجعية أكبر من صفر.",
  "Reference Unit is not allowed.": "الوحدة المرجعية غير مسموح بها.",
  "Cost must be numeric.": "يجب أن تكون التكلفة رقمًا.",
  "Cost must be greater than or equal to 0.": "يجب أن تكون التكلفة أكبر من أو تساوي صفرًا.",
  "Cost Currency must be SAR.": "يجب أن تكون عملة التكلفة SAR.",
  "Calories must be numeric.": "يجب أن تكون السعرات رقمًا.",
  "Calories must be greater than or equal to 0.": "يجب أن تكون السعرات أكبر من أو تساوي صفرًا.",
  "Calorie Reference Quantity must be numeric.": "يجب أن تكون الكمية المرجعية للسعرات رقمًا.",
  "Calorie Reference Quantity must be greater than 0.": "يجب أن تكون الكمية المرجعية للسعرات أكبر من صفر.",
  "Calorie Reference Unit is not allowed.": "الوحدة المرجعية للسعرات غير مسموح بها.",
  "Effective Date must use yyyy-mm-dd hh:mm or a valid Excel date.": "يجب أن يكون تاريخ السريان بصيغة yyyy-mm-dd hh:mm أو تاريخ Excel صالح.",
  "A reference already exists for this item and effective date. Previous references are immutable.": "يوجد مرجع بالفعل لهذا الصنف وتاريخ السريان. المراجع السابقة ثابتة ولا يمكن تعديلها.",
  "Cost and calorie reference units must use the same unit family.": "يجب أن تستخدم وحدتا التكلفة والسعرات نفس فئة القياس."
};

function errorMessage(error: ItemReferenceImportError, locale: string) {
  if (locale !== "ar") return error.message;
  if (arabicErrors[error.message]) return arabicErrors[error.message];
  let match = error.message.match(/^Missing required column: (.+)\.$/);
  if (match) return `العمود المطلوب غير موجود: ${match[1]}.`;
  match = error.message.match(/^Unexpected column: (.+)\.$/);
  if (match) return `عمود غير متوقع: ${match[1]}.`;
  match = error.message.match(/^Item code (.+) does not exist\.$/);
  if (match) return `رمز الصنف ${match[1]} غير موجود.`;
  match = error.message.match(/^Item code (.+) is inactive\.$/);
  if (match) return `رمز الصنف ${match[1]} غير نشط.`;
  match = error.message.match(/^Item Name does not match item code (.+)\.$/);
  if (match) return `اسم الصنف لا يطابق الرمز ${match[1]}.`;
  match = error.message.match(/^Reference Unit is incompatible with the item's base unit \((.+)\)\.$/);
  if (match) return `الوحدة المرجعية غير متوافقة مع وحدة الصنف الأساسية (${match[1]}).`;
  match = error.message.match(/^Duplicates row (\d+) for the same item and effective date\.$/);
  if (match) return `يتكرر مع الصف ${match[1]} لنفس الصنف وتاريخ السريان.`;
  match = error.message.match(/^A maximum of (\d+) data rows can be imported\.$/);
  if (match) return `الحد الأقصى للاستيراد هو ${match[1]} صف بيانات.`;
  match = error.message.match(/^Category is required to create new item (.+)\.$/);
  if (match) return `الفئة مطلوبة لإنشاء الصنف الجديد ${match[1]}.`;
  match = error.message.match(/^Category (.+) does not exist\.$/);
  if (match) return `الفئة ${match[1]} غير موجودة.`;
  match = error.message.match(/^All rows for new item (.+) must use the same item details as row (\d+)\.$/);
  if (match) return `يجب أن تستخدم كل صفوف الصنف الجديد ${match[1]} نفس بيانات الصنف الموجودة في الصف ${match[2]}.`;
  return error.message;
}

export function ItemExcelActions({ canManage }: { canManage: boolean }) {
  const locale = useLocale();
  const labels = locale === "ar" ? copy.ar : copy.en;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<ItemReferenceImportError[]>([]);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  if (!canManage) return null;

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
      const response = await fetch("/api/inventory/items/excel", { method: "POST", body: formData });
      const result = await response.json() as { success?: boolean; importedRowCount?: number; createdItemCount?: number; errors?: ItemReferenceImportError[]; error?: string };
      if (response.ok && result.success) {
        setIsSuccess(true);
        setMessage(labels.success(result.importedRowCount ?? 0, result.createdItemCount ?? 0));
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
    <section className="rounded-lg border bg-white p-4 shadow-sm sm:p-5" aria-labelledby="item-excel-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-bold" id="item-excel-title">{labels.title}</h2>
            <p className="mt-1 text-sm text-secondary">{labels.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
            download
            href={`/api/inventory/items/excel?locale=${locale}`}
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
                    <td className="px-4 py-2 font-semibold">{error.row || "—"}</td>
                    <td className="px-4 py-2">{locale === "ar" ? arabicColumns[error.column] ?? error.column : error.column}</td>
                    <td className="px-4 py-2 text-error">{errorMessage(error, locale)}</td>
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
