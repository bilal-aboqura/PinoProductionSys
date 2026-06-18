"use client";

import { useMemo, useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recordManualAdjustment } from "@/features/inventory/actions";
import type { BalanceDto, InventoryItemDto, WarehouseDto } from "@/features/inventory/types";

export function AdjustmentForm({ items, warehouses, balances }: { items: InventoryItemDto[]; warehouses: WarehouseDto[]; balances: BalanceDto[] }) {
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedBalance = useMemo(
    () => balances.find((balance) => balance.itemId === itemId && balance.warehouseId === warehouseId),
    [balances, itemId, warehouseId]
  );

  return (
    <form
      className="grid gap-3 rounded-md border bg-white p-4 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const result = await recordManualAdjustment({
            inventoryItemId: formData.get("inventoryItemId"),
            warehouseId: formData.get("warehouseId"),
            quantityDelta: formData.get("quantityDelta"),
            reason: formData.get("reason"),
            notes: formData.get("notes")
          });
          setMessage(
            result.success
              ? "Adjustment recorded."
              : result.error.code === "ADJUSTMENT_BLOCKED_NEGATIVE_STOCK"
                ? "Adjustment blocked: would result in negative stock. Use a positive stock correction to reconcile the count first."
                : result.error.message
          );
          if (result.success && form.isConnected) {
            form.reset();
            setItemId("");
            setWarehouseId("");
          }
        });
      }}
    >
      <select className="rounded-md border px-3 py-2 text-sm" name="inventoryItemId" required value={itemId} onChange={(event) => setItemId(event.target.value)}>
        <option value="">Item</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.code} - {item.nameEn}
          </option>
        ))}
      </select>
      <select className="rounded-md border px-3 py-2 text-sm" name="warehouseId" required value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}>
        <option value="">Warehouse</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name}
          </option>
        ))}
      </select>
      <input className="rounded-md border px-3 py-2 text-sm" name="quantityDelta" placeholder="+/- Quantity" type="number" step="0.001" required />
      <select className="rounded-md border px-3 py-2 text-sm" name="reason" required>
        <option value="INVENTORY_RECONCILIATION">Inventory Reconciliation</option>
        <option value="STOCK_COUNT_CORRECTION">Stock Count Correction</option>
        <option value="DAMAGED_GOODS">Damaged Goods</option>
        <option value="LOST_MATERIALS">Lost Materials</option>
      </select>
      <input className="rounded-md border px-3 py-2 text-sm" name="notes" placeholder="Notes" />
      <div className="md:col-span-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          <SlidersHorizontal className="h-4 w-4" />
          Record Adjustment
        </Button>
        <p className="text-sm font-semibold text-secondary">
          Current: {selectedBalance ? `${selectedBalance.currentQuantity} ${selectedBalance.unit}` : "0"}
        </p>
        {message ? <p className="text-sm font-semibold text-secondary">{message}</p> : null}
      </div>
    </form>
  );
}
