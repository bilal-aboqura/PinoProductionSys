"use client";

import { useState, useTransition } from "react";
import { Edit, PowerOff, Warehouse as WarehouseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createWarehouse, deactivateWarehouse, updateWarehouse } from "@/features/inventory/actions";
import type { WarehouseDto } from "@/features/inventory/types";

export function WarehouseForm({ warehouse, canManage }: { warehouse?: WarehouseDto; canManage: boolean }) {
  const [open, setOpen] = useState(!warehouse);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(warehouse);

  if (!canManage) {
    return isEdit ? null : <div className="rounded-md border bg-white p-4 text-sm text-muted">Inventory management permission is required to create or deactivate warehouses.</div>;
  }

  return (
    <div>
      {isEdit ? (
        <Button variant="ghost" className="h-8 px-2" onClick={() => setOpen(true)} title="Edit warehouse" aria-label={`Edit ${warehouse?.code}`}>
          <Edit className="h-4 w-4" />
        </Button>
      ) : null}
      {open ? (
        <div className={isEdit ? "fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4" : ""}>
          <form
            className="grid w-full gap-3 rounded-md border bg-white p-4 shadow-sm md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(form);
              startTransition(async () => {
                const payload = {
                  code: formData.get("code"),
                  name: formData.get("name"),
                  description: formData.get("description")
                };
                const result = isEdit && warehouse ? await updateWarehouse(warehouse.id, payload) : await createWarehouse(payload);
                setMessage(result.success ? (isEdit ? "Warehouse updated." : "Warehouse created.") : result.error.message);
                if (result.success && isEdit) setOpen(false);
                if (result.success && !isEdit && form.isConnected) form.reset();
              });
            }}
          >
            <div className="md:col-span-4 flex items-center justify-between">
              <h2 className="font-bold">{isEdit ? `Warehouse ${warehouse?.code}` : "Create Warehouse"}</h2>
              {isEdit ? (
                <button className="text-sm font-semibold text-secondary" type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              ) : null}
            </div>
            <input className="rounded-md border px-3 py-2 text-sm" name="code" placeholder="Code" required defaultValue={warehouse?.code ?? ""} />
            <input className="rounded-md border px-3 py-2 text-sm" name="name" placeholder="Name" required defaultValue={warehouse?.name ?? ""} />
            <input
              className="rounded-md border px-3 py-2 text-sm md:col-span-2"
              name="description"
              placeholder="Description"
              defaultValue={warehouse?.description ?? ""}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                <WarehouseIcon className="h-4 w-4" />
                {isEdit ? "Save" : "Create Warehouse"}
              </Button>
              {isEdit && warehouse?.isActive ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deactivateWarehouse(warehouse.id);
                      setMessage(result.success ? "Warehouse deactivated." : result.error.message);
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
