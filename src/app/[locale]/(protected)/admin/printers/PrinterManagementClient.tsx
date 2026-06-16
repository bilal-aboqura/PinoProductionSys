"use client";

import { Edit2, Plus, Power } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { savePrinterConfig, deletePrinterConfig } from "@/features/printing/actions";
import type { PrinterDto } from "@/features/printing/types";

type FormState = {
  name: string;
  description: string;
  type: "THERMAL" | "STANDARD" | "PDF_OUTPUT";
  isDefault: boolean;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  type: "THERMAL",
  isDefault: false,
  isActive: true
};

export function PrinterManagementClient({ printers }: { printers: PrinterDto[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function edit(printer: PrinterDto) {
    setEditingId(printer.id);
    setForm({
      name: printer.name,
      description: printer.description ?? "",
      type: printer.type,
      isDefault: printer.isDefault,
      isActive: printer.isActive
    });
    setMessage("");
  }

  function create() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  function submit() {
    startTransition(async () => {
      const result = await savePrinterConfig(editingId, form);
      setMessage(result.success ? "Printer saved." : result.error);
      if (result.success) create();
    });
  }

  function deactivate(id: string) {
    startTransition(async () => {
      const result = await deletePrinterConfig(id);
      setMessage(result.success ? "Printer deactivated." : result.error);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-background text-left text-xs uppercase text-secondary">
            <tr>
              <th className="px-4 py-3">Printer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {printers.map((printer) => (
              <tr key={printer.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-semibold">{printer.name}</div>
                  <div className="text-secondary">{printer.description}</div>
                </td>
                <td className="px-4 py-3">{printer.type}</td>
                <td className="px-4 py-3">{printer.isDefault ? "Yes" : "No"}</td>
                <td className="px-4 py-3">{printer.isActive ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" className="h-9 w-9 px-0" aria-label={`Edit ${printer.name}`} title="Edit" onClick={() => edit(printer)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="h-9 w-9 px-0" aria-label={`Deactivate ${printer.name}`} title="Deactivate" onClick={() => deactivate(printer.id)} disabled={!printer.isActive}>
                      <Power className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {printers.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-secondary" colSpan={5}>
                  No printers configured.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{editingId ? "Edit Printer" : "Add Printer"}</h2>
          <Button variant="ghost" className="h-9 w-9 px-0" title="New printer" aria-label="New printer" onClick={create}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Name
            <input className="rounded-md border px-3 py-2" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Description
            <textarea className="min-h-20 rounded-md border px-3 py-2" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Type
            <select className="rounded-md border bg-white px-3 py-2" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FormState["type"] }))}>
              <option value="THERMAL">Thermal</option>
              <option value="STANDARD">Standard</option>
              <option value="PDF_OUTPUT">PDF Output</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />
            Default printer
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            Active
          </label>
          <Button onClick={submit} disabled={isPending}>
            Save
          </Button>
          {message ? <p className="text-sm font-semibold text-secondary">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}
