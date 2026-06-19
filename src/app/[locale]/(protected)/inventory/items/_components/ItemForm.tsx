"use client";

import { useState, useTransition } from "react";
import { Edit, PackagePlus, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createInventoryItem, deactivateInventoryItem, updateInventoryItem } from "@/features/inventory/actions";
import type { InventoryCategoryDto, InventoryItemDto } from "@/features/inventory/types";

type ItemFormProps = {
  categories: InventoryCategoryDto[];
  item?: InventoryItemDto;
  canManage: boolean;
};

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

export function ItemForm({ categories, item, canManage }: ItemFormProps) {
  const [open, setOpen] = useState(!item);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(item);

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
        <div className={isEdit ? "fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4" : ""}>
          <form
            className={`grid w-full gap-3 rounded-md border bg-white p-4 shadow-sm md:grid-cols-4 ${isEdit ? "max-w-4xl" : ""}`}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const payload = dataFromForm(form);
              startTransition(async () => {
                const result = isEdit && item ? await updateInventoryItem(item.id, payload) : await createInventoryItem(payload);
                setMessage(result.success ? (isEdit ? "Item updated." : "Item created.") : result.error.message);
                if (result.success && isEdit) setOpen(false);
                if (result.success && !isEdit && form.isConnected) form.reset();
              });
            }}
          >
            <div className="md:col-span-4 flex items-center justify-between">
              <h2 className="font-bold">{isEdit ? `Edit ${item?.code}` : "Create Item"}</h2>
              {isEdit ? (
                <button className="text-sm font-semibold text-secondary" type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              ) : null}
            </div>
            <input className="rounded-md border px-3 py-2 text-sm" name="code" placeholder="Code" required defaultValue={item?.code ?? ""} />
            <input className="rounded-md border px-3 py-2 text-sm" name="nameEn" placeholder="English name" required defaultValue={item?.nameEn ?? ""} />
            <input className="rounded-md border px-3 py-2 text-sm" name="nameAr" placeholder="Arabic name" required defaultValue={item?.nameAr ?? ""} />
            <select className="rounded-md border px-3 py-2 text-sm" name="itemType" required defaultValue={item?.itemType ?? "RAW_MATERIAL"}>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="FINISHED_PRODUCT">Finished Product</option>
            </select>
            <select className="rounded-md border px-3 py-2 text-sm" name="categoryId" required defaultValue={item?.categoryId ?? ""}>
              <option value="">Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className="rounded-md border px-3 py-2 text-sm" name="unit" required defaultValue={item?.unit ?? "KG"}>
              <option value="KG">KG</option>
              <option value="GRAM">GRAM</option>
              <option value="LITER">LITER</option>
              <option value="MILLILITER">MILLILITER</option>
              <option value="PIECE">PIECE</option>
            </select>
            <input
              className="rounded-md border px-3 py-2 text-sm"
              name="minStockLevel"
              placeholder="Min stock"
              type="number"
              step="0.001"
              min="0"
              defaultValue={item?.minStockLevel ?? "0"}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                <PackagePlus className="h-4 w-4" />
                {isEdit ? "Save" : "Create Item"}
              </Button>
              {isEdit && item?.isActive ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deactivateInventoryItem(item.id);
                      setMessage(result.success ? "Item deactivated." : result.error.message);
                      if (result.success) setOpen(false);
                    })
                  }
                >
                  <PowerOff className="h-4 w-4" />
                  Deactivate
                </Button>
              ) : null}
            </div>
            {message ? <p className="md:col-span-4 text-sm font-semibold text-secondary">{message}</p> : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}
