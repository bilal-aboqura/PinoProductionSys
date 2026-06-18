"use client";

import { ArchiveRestore, Edit, Plus, PowerOff } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { archiveMasterEntity, createMasterEntity, restoreMasterEntity, updateMasterEntity } from "@/features/settings/actions";
import type { MasterEntityDto, MasterEntityType } from "@/features/settings/types";

function needsCode(entityType: MasterEntityType) {
  return entityType === "warehouses" || entityType === "waste_reasons";
}

function needsLocalizedNames(entityType: MasterEntityType) {
  return entityType !== "label_templates";
}

function needsTemperature(entityType: MasterEntityType) {
  return entityType === "storage_conditions";
}

function needsDimensions(entityType: MasterEntityType) {
  return entityType === "label_templates";
}

export function MasterDataForm({
  entityType,
  item,
  canManage
}: {
  entityType: MasterEntityType;
  item?: MasterEntityDto;
  canManage: boolean;
}) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(item);

  if (!canManage) return null;

  return (
    <div className="space-y-2">
      <form
        className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const payload = Object.fromEntries(formData.entries());
          startTransition(async () => {
            const result = item
              ? await updateMasterEntity(entityType, item.id, payload)
              : await createMasterEntity(entityType, payload);
            setMessage(result.success ? (item ? "Saved." : "Created.") : result.error);
            if (result.success && !item && form.isConnected) form.reset();
          });
        }}
      >
        {needsCode(entityType) ? (
          <input className="rounded-md border px-3 py-2 text-sm" name="code" defaultValue={item?.code ?? ""} placeholder="Code" required />
        ) : null}
        {needsLocalizedNames(entityType) ? (
          <>
            <input className="rounded-md border px-3 py-2 text-sm" name="nameEn" defaultValue={item?.nameEn ?? item?.name ?? ""} placeholder="Name English" required />
            <input className="rounded-md border px-3 py-2 text-sm" name="nameAr" defaultValue={item?.nameAr ?? ""} placeholder="Name Arabic" required />
            <input className="rounded-md border px-3 py-2 text-sm" name="description" defaultValue={item?.description ?? ""} placeholder="Description" />
          </>
        ) : (
          <input className="rounded-md border px-3 py-2 text-sm" name="name" defaultValue={item?.name ?? ""} placeholder="Template name" required />
        )}
        {needsDimensions(entityType) ? (
          <input className="rounded-md border px-3 py-2 text-sm" name="dimensions" defaultValue={item?.dimensions ?? ""} placeholder="Dimensions, e.g. 50x30mm" required />
        ) : null}
        {needsTemperature(entityType) ? (
          <>
            <input className="rounded-md border px-3 py-2 text-sm" name="minTemperature" defaultValue={item?.minTemperature ?? ""} placeholder="Min temp" type="number" step="0.01" />
            <input className="rounded-md border px-3 py-2 text-sm" name="maxTemperature" defaultValue={item?.maxTemperature ?? ""} placeholder="Max temp" type="number" step="0.01" />
          </>
        ) : null}
        <input type="hidden" name="isActive" value="false" />
        <label className="inline-flex items-center gap-2 text-sm font-semibold text-secondary">
          <input type="checkbox" name="isActive" value="true" defaultChecked={item?.isActive ?? true} />
          Active
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
          <Button type="submit" disabled={isPending}>
            {isEdit ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? "Save" : "Create"}
          </Button>
          {item ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = item.isActive ? await archiveMasterEntity(entityType, item.id) : await restoreMasterEntity(entityType, item.id);
                  setMessage(result.success ? (item.isActive ? "Archived." : "Restored.") : result.error);
                })
              }
            >
              {item.isActive ? <PowerOff className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
              {item.isActive ? "Archive" : "Restore"}
            </Button>
          ) : null}
          {message ? <p className="text-sm font-semibold text-secondary">{message}</p> : null}
        </div>
      </form>
    </div>
  );
}
