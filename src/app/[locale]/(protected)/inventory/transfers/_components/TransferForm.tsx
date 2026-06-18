"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transferInventory } from "@/features/inventory/actions";
import type { BalanceDto, InventoryItemDto, WarehouseDto } from "@/features/inventory/types";

export function TransferForm({
  items,
  sourceWarehouses,
  destinationWarehouses,
  balances
}: {
  items: InventoryItemDto[];
  sourceWarehouses: WarehouseDto[];
  destinationWarehouses: WarehouseDto[];
  balances: BalanceDto[];
}) {
  const [itemId, setItemId] = useState("");
  const [sourceWhId, setSourceWhId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedBalance = useMemo(
    () => balances.find((balance) => balance.itemId === itemId && balance.warehouseId === sourceWhId),
    [balances, itemId, sourceWhId]
  );

  return (
    <form
      className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const result = await transferInventory({
            itemId: formData.get("itemId"),
            sourceWhId: formData.get("sourceWhId"),
            destWhId: formData.get("destWhId"),
            quantity: formData.get("quantity"),
            notes: formData.get("notes")
          });
          setMessage(result.success ? "Transfer recorded." : result.error.message);
          if (result.success && form.isConnected) {
            form.reset();
            setItemId("");
            setSourceWhId("");
          }
        });
      }}
    >
      <select className="rounded-md border px-3 py-2 text-sm" name="itemId" required value={itemId} onChange={(event) => setItemId(event.target.value)}>
        <option value="">Item</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} - {item.nameEn}
          </option>
        ))}
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" name="sourceWhId" required value={sourceWhId} onChange={(event) => setSourceWhId(event.target.value)}>
        <option value="">Source</option>
        {sourceWarehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name}
          </option>
        ))}
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" name="destWhId" required>
        <option value="">Destination</option>
        {destinationWarehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name}
          </option>
        ))}
      </select>
      <input className="rounded-md border px-3 py-2 text-sm" name="quantity" placeholder="Quantity" type="number" step="0.001" min="0.001" required />
      <input className="rounded-md border px-3 py-2 text-sm" name="notes" placeholder="Notes" />
      <div className="md:col-span-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <ArrowRightLeft className="h-4 w-4" />
          Transfer
        </Button>
        <p className="text-sm font-semibold text-secondary">
          Available: {selectedBalance ? `${selectedBalance.availableQuantity} ${selectedBalance.unit}` : "0"}
        </p>
        {message ? <p className="text-sm font-semibold text-secondary">{message}</p> : null}
      </div>
    </form>
  );
}
