"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { CalendarDays, CircleDollarSign, Edit, Flame, Info, PackagePlus, PowerOff, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInventoryItem, deactivateInventoryItem, updateInventoryItem, upsertIngredientReferenceProfile } from "@/features/inventory/actions";
import type { InventoryCategoryDto, InventoryItemDto } from "@/features/inventory/types";

type ItemFormProps = {
  categories: InventoryCategoryDto[];
  item?: InventoryItemDto;
  canManage: boolean;
};

type FieldErrors = Record<string, string>;

const units = ["KG", "GRAM", "LITER", "MILLILITER", "PIECE"];
const controlClass = "min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-error aria-[invalid=true]:ring-error/10";

const copy = {
  en: {
    code: "Code",
    englishName: "English Name",
    arabicName: "Arabic Name",
    itemType: "Item Type",
    category: "Category",
    selectCategory: "Select a category",
    unit: "Unit",
    minimumStock: "Minimum Stock",
    newReference: "New Effective Cost & Calorie Reference",
    referenceDescription: "Add a new effective-dated reference for recipe costing and nutrition.",
    referenceQuantity: "Reference Quantity",
    quantity: "Quantity",
    costInformation: "Cost Information",
    cost: "Cost",
    costCurrency: "Cost Unit / Currency",
    calorieInformation: "Calorie Information",
    calories: "Calories",
    perUnit: "Per Unit",
    effectiveDate: "Effective Date",
    effectiveFrom: "Effective From",
    currentReference: "Current Active Reference",
    immutable: "Previous profiles remain immutable.",
    noCurrentReference: "No active reference is configured yet.",
    costLabel: "Normalized cost",
    caloriesLabel: "Normalized calories",
    referenceHistory: "Reference History",
    noHistory: "No reference profile history.",
    required: "This field is required.",
    invalidNumber: "Enter a valid number.",
    minimumValue: "Enter a value of at least"
  },
  ar: {
    code: "الرمز",
    englishName: "الاسم بالإنجليزية",
    arabicName: "الاسم بالعربية",
    itemType: "نوع الصنف",
    category: "الفئة",
    selectCategory: "اختر فئة",
    unit: "الوحدة",
    minimumStock: "الحد الأدنى للمخزون",
    newReference: "مرجع جديد للتكلفة والسعرات بتاريخ سريان",
    referenceDescription: "أضف مرجعًا جديدًا بتاريخ سريان لحساب تكلفة الوصفات وقيمتها الغذائية.",
    referenceQuantity: "الكمية المرجعية",
    quantity: "الكمية",
    costInformation: "معلومات التكلفة",
    cost: "التكلفة",
    costCurrency: "وحدة التكلفة / العملة",
    calorieInformation: "معلومات السعرات",
    calories: "السعرات",
    perUnit: "لكل وحدة",
    effectiveDate: "تاريخ السريان",
    effectiveFrom: "ساري من",
    currentReference: "المرجع النشط الحالي",
    immutable: "تظل المراجع السابقة ثابتة ولا يمكن تعديلها.",
    noCurrentReference: "لم يتم إعداد مرجع نشط بعد.",
    costLabel: "التكلفة المعيارية",
    caloriesLabel: "السعرات المعيارية",
    referenceHistory: "سجل المراجع",
    noHistory: "لا يوجد سجل للمراجع.",
    required: "هذا الحقل مطلوب.",
    invalidNumber: "أدخل رقمًا صحيحًا.",
    minimumValue: "أدخل قيمة لا تقل عن"
  }
} as const;

function dataFromForm(form: HTMLFormElement) {
  const formData = new FormData(form);
  return {
    code: formData.get("code"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    itemType: formData.get("itemType"),
    categoryId: formData.get("categoryId"),
    unit: formData.get("unit"),
    minStockLevel: formData.get("minStockLevel")
  };
}

function referenceFromForm(form: HTMLFormElement, inventoryItemId: string) {
  const data = new FormData(form);
  return {
    inventoryItemId,
    costReferenceQuantity: data.get("costReferenceQuantity"),
    costReferenceUnit: data.get("costReferenceUnit"),
    costReferenceValue: data.get("costReferenceValue"),
    calorieReferenceQuantity: data.get("calorieReferenceQuantity"),
    calorieReferenceUnit: data.get("calorieReferenceUnit"),
    calorieValue: data.get("calorieValue"),
    effectiveAt: data.get("effectiveAt") || undefined
  };
}

function validateForm(form: HTMLFormElement, labels: (typeof copy)["en"] | (typeof copy)["ar"]) {
  const errors: FieldErrors = {};
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement) || !element.name || element.validity.valid) continue;
    if (element.validity.valueMissing) errors[element.name] = labels.required;
    else if (element instanceof HTMLInputElement && element.validity.rangeUnderflow) errors[element.name] = `${labels.minimumValue} ${element.min}.`;
    else errors[element.name] = labels.invalidNumber;
  }
  return errors;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <label className="text-sm font-semibold text-secondary" htmlFor={id}>{label}</label>
      {children}
      {error ? <p className="text-xs font-medium text-error" id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  );
}

export function ItemForm({ categories, item, canManage }: ItemFormProps) {
  const locale = useLocale();
  const labels = locale === "ar" ? copy.ar : copy.en;
  const idPrefix = useId();
  const [open, setOpen] = useState(!item);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(item);
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const describedBy = (name: string) => fieldErrors[name] ? `${fieldId(name)}-error` : undefined;

  if (!canManage) {
    return isEdit ? null : <div className="rounded-md border bg-white p-4 text-sm text-muted">Inventory management permission is required to create or edit items.</div>;
  }

  return (
    <div>
      {isEdit ? (
        <Button variant="ghost" className="h-8 px-2" onClick={() => setOpen(true)} title="Edit item" aria-label={`Edit ${item?.code}`}>
          <Edit className="h-4 w-4" />
        </Button>
      ) : null}
      {open ? (
        <div className={isEdit ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/25 p-3 sm:items-center sm:p-4" : ""}>
          <form
            className={`grid w-full gap-5 rounded-lg border bg-white p-4 shadow-sm sm:p-6 md:grid-cols-4 ${isEdit ? "my-auto max-h-[calc(100vh-1.5rem)] max-w-5xl overflow-y-auto" : ""}`}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const errors = validateForm(form, labels);
              setFieldErrors(errors);
              if (Object.keys(errors).length > 0) return;
              const payload = dataFromForm(form);
              startTransition(async () => {
                const result = isEdit && item ? await updateInventoryItem(item.id, payload) : await createInventoryItem(payload);
                if (result.success && isEdit && item && form.elements.namedItem("costReferenceQuantity")) {
                  const profileResult = await upsertIngredientReferenceProfile(referenceFromForm(form, item.id));
                  setMessage(profileResult.success ? "Item and reference profile updated." : profileResult.error.message);
                } else setMessage(result.success ? (isEdit ? "Item updated." : "Item created.") : result.error.message);
                if (result.success && isEdit) setOpen(false);
                if (result.success && !isEdit && form.isConnected) form.reset();
              });
            }}
          >
            <div className="flex items-center justify-between md:col-span-4">
              <h2 className="text-lg font-bold">{isEdit ? `Edit ${item?.code}` : "Create Item"}</h2>
              {isEdit ? (
                <button className="text-sm font-semibold text-secondary" type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              ) : null}
            </div>

            <Field id={fieldId("code")} label={labels.code} error={fieldErrors.code}>
              <input className={controlClass} id={fieldId("code")} name="code" placeholder={labels.code} required defaultValue={item?.code ?? ""} aria-invalid={Boolean(fieldErrors.code)} aria-describedby={describedBy("code")} />
            </Field>
            <Field id={fieldId("nameEn")} label={labels.englishName} error={fieldErrors.nameEn}>
              <input className={controlClass} id={fieldId("nameEn")} name="nameEn" placeholder={labels.englishName} required defaultValue={item?.nameEn ?? ""} aria-invalid={Boolean(fieldErrors.nameEn)} aria-describedby={describedBy("nameEn")} />
            </Field>
            <Field id={fieldId("nameAr")} label={labels.arabicName} error={fieldErrors.nameAr}>
              <input className={controlClass} id={fieldId("nameAr")} name="nameAr" placeholder={labels.arabicName} required defaultValue={item?.nameAr ?? ""} aria-invalid={Boolean(fieldErrors.nameAr)} aria-describedby={describedBy("nameAr")} />
            </Field>
            <Field id={fieldId("itemType")} label={labels.itemType} error={fieldErrors.itemType}>
              <select className={controlClass} id={fieldId("itemType")} name="itemType" required defaultValue={item?.itemType ?? "RAW_MATERIAL"} aria-invalid={Boolean(fieldErrors.itemType)} aria-describedby={describedBy("itemType")}>
                <option value="RAW_MATERIAL">Raw Material</option>
                <option value="FINISHED_PRODUCT">Finished Product</option>
              </select>
            </Field>
            <Field id={fieldId("categoryId")} label={labels.category} error={fieldErrors.categoryId}>
              <select className={controlClass} id={fieldId("categoryId")} name="categoryId" required defaultValue={item?.categoryId ?? ""} aria-invalid={Boolean(fieldErrors.categoryId)} aria-describedby={describedBy("categoryId")}>
                <option value="">{labels.selectCategory}</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <Field id={fieldId("unit")} label={labels.unit} error={fieldErrors.unit}>
              <select className={controlClass} id={fieldId("unit")} name="unit" required defaultValue={item?.unit ?? "KG"} aria-invalid={Boolean(fieldErrors.unit)} aria-describedby={describedBy("unit")}>
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </Field>
            <Field id={fieldId("minStockLevel")} label={labels.minimumStock} error={fieldErrors.minStockLevel}>
              <input className={controlClass} id={fieldId("minStockLevel")} name="minStockLevel" placeholder="0" type="number" step="0.001" min="0" defaultValue={item?.minStockLevel ?? "0"} aria-invalid={Boolean(fieldErrors.minStockLevel)} aria-describedby={describedBy("minStockLevel")} />
            </Field>

            {isEdit ? (
              <div className="grid gap-5 border-t pt-5 md:col-span-4">
                <div>
                  <h3 className="text-lg font-bold text-primary">{labels.newReference}</h3>
                  <p className="mt-1 text-sm text-secondary">{labels.referenceDescription}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-3" dir={locale === "ar" ? "rtl" : "ltr"}>
                  <section className="grid content-start gap-4 rounded-lg border bg-background/40 p-4" aria-labelledby={`${idPrefix}-quantity-heading`}>
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h4 className="font-bold" id={`${idPrefix}-quantity-heading`}>{labels.referenceQuantity}</h4>
                    </div>
                    <Field id={fieldId("costReferenceQuantity")} label={labels.quantity} error={fieldErrors.costReferenceQuantity}>
                      <input className={controlClass} id={fieldId("costReferenceQuantity")} name="costReferenceQuantity" type="number" min="0.001" step="0.001" required placeholder="0.000" aria-invalid={Boolean(fieldErrors.costReferenceQuantity)} aria-describedby={describedBy("costReferenceQuantity")} />
                    </Field>
                    <Field id={fieldId("costReferenceUnit")} label={labels.unit} error={fieldErrors.costReferenceUnit}>
                      <select className={controlClass} id={fieldId("costReferenceUnit")} name="costReferenceUnit" defaultValue={item?.unit} aria-invalid={Boolean(fieldErrors.costReferenceUnit)} aria-describedby={describedBy("costReferenceUnit")}>
                        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                    </Field>
                  </section>

                  <section className="grid content-start gap-4 rounded-lg border bg-background/40 p-4" aria-labelledby={`${idPrefix}-cost-heading`}>
                    <div className="flex items-center gap-2 border-b pb-3">
                      <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h4 className="font-bold" id={`${idPrefix}-cost-heading`}>{labels.costInformation}</h4>
                    </div>
                    <Field id={fieldId("costReferenceValue")} label={labels.cost} error={fieldErrors.costReferenceValue}>
                      <input className={controlClass} id={fieldId("costReferenceValue")} name="costReferenceValue" type="number" min="0" step="0.01" required placeholder="0.00" aria-invalid={Boolean(fieldErrors.costReferenceValue)} aria-describedby={describedBy("costReferenceValue")} />
                    </Field>
                    <div className="grid content-start gap-1.5">
                      <span className="text-sm font-semibold text-secondary">{labels.costCurrency}</span>
                      <div className="flex min-h-10 items-center rounded-md border bg-accent/15 px-3 py-2 text-sm font-semibold">EGP</div>
                    </div>
                  </section>

                  <section className="grid content-start gap-4 rounded-lg border bg-background/40 p-4" aria-labelledby={`${idPrefix}-calorie-heading`}>
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Flame className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h4 className="font-bold" id={`${idPrefix}-calorie-heading`}>{labels.calorieInformation}</h4>
                    </div>
                    <Field id={fieldId("calorieValue")} label={labels.calories} error={fieldErrors.calorieValue}>
                      <input className={controlClass} id={fieldId("calorieValue")} name="calorieValue" type="number" min="0" step="0.01" required placeholder="0.00" aria-invalid={Boolean(fieldErrors.calorieValue)} aria-describedby={describedBy("calorieValue")} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field id={fieldId("calorieReferenceQuantity")} label={labels.quantity} error={fieldErrors.calorieReferenceQuantity}>
                        <input className={controlClass} id={fieldId("calorieReferenceQuantity")} name="calorieReferenceQuantity" type="number" min="0.001" step="0.001" required placeholder="0.000" aria-invalid={Boolean(fieldErrors.calorieReferenceQuantity)} aria-describedby={describedBy("calorieReferenceQuantity")} />
                      </Field>
                      <Field id={fieldId("calorieReferenceUnit")} label={labels.perUnit} error={fieldErrors.calorieReferenceUnit}>
                        <select className={controlClass} id={fieldId("calorieReferenceUnit")} name="calorieReferenceUnit" defaultValue={item?.unit} aria-invalid={Boolean(fieldErrors.calorieReferenceUnit)} aria-describedby={describedBy("calorieReferenceUnit")}>
                          {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                        </select>
                      </Field>
                    </div>
                  </section>
                </div>

                <section className="grid gap-3 rounded-lg border p-4" aria-labelledby={`${idPrefix}-date-heading`}>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h4 className="font-bold" id={`${idPrefix}-date-heading`}>{labels.effectiveDate}</h4>
                  </div>
                  <Field id={fieldId("effectiveAt")} label={labels.effectiveFrom} error={fieldErrors.effectiveAt}>
                    <input className={controlClass} id={fieldId("effectiveAt")} name="effectiveAt" type="datetime-local" aria-invalid={Boolean(fieldErrors.effectiveAt)} aria-describedby={describedBy("effectiveAt")} />
                  </Field>
                </section>

                <aside className="overflow-hidden rounded-lg border border-accent bg-accent/15" aria-labelledby={`${idPrefix}-current-heading`}>
                  <div className="flex items-start gap-3 border-b border-accent px-4 py-3 sm:px-5">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <h4 className="font-bold" id={`${idPrefix}-current-heading`}>{labels.currentReference}</h4>
                      <p className="mt-0.5 text-sm text-secondary">{labels.immutable}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 p-4 sm:p-5">
                    {item?.currentReferenceProfile ? (
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md bg-white p-3 shadow-sm">
                          <dt className="text-xs font-semibold text-secondary">{labels.costLabel}</dt>
                          <dd className="mt-1 font-bold">{item.currentReferenceProfile.normalizedCost} EGP / {item.currentReferenceProfile.costReferenceUnit}</dd>
                        </div>
                        <div className="rounded-md bg-white p-3 shadow-sm">
                          <dt className="text-xs font-semibold text-secondary">{labels.caloriesLabel}</dt>
                          <dd className="mt-1 font-bold">{item.currentReferenceProfile.normalizedCalories} kcal / {item.currentReferenceProfile.calorieReferenceUnit}</dd>
                        </div>
                      </dl>
                    ) : <p className="text-sm text-secondary">{labels.noCurrentReference}</p>}

                    <div>
                      <h5 className="mb-2 text-sm font-bold">{labels.referenceHistory}</h5>
                      <div className="max-h-36 space-y-2 overflow-auto text-xs text-secondary">
                        {item?.referenceProfiles.length ? item.referenceProfiles.map((profile) => (
                          <div className="rounded-md border bg-white px-3 py-2" key={profile.id}>
                            <time className="font-semibold">{new Date(profile.effectiveAt).toLocaleString(locale)}</time>
                            <span className="block mt-1">{profile.costReferenceValue} EGP / {profile.costReferenceQuantity} {profile.costReferenceUnit}; {profile.calorieValue} kcal / {profile.calorieReferenceQuantity} {profile.calorieReferenceUnit}</span>
                          </div>
                        )) : labels.noHistory}
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 md:col-span-4">
              <Button type="submit" disabled={isPending}>
                <PackagePlus className="h-4 w-4" />
                {isEdit ? "Save" : "Create Item"}
              </Button>
              {isEdit && item?.isActive ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={() => startTransition(async () => {
                    const result = await deactivateInventoryItem(item.id);
                    setMessage(result.success ? "Item deactivated." : result.error.message);
                    if (result.success) setOpen(false);
                  })}
                >
                  <PowerOff className="h-4 w-4" />
                  Deactivate
                </Button>
              ) : null}
            </div>
            {message ? <p className="text-sm font-semibold text-secondary md:col-span-4">{message}</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
