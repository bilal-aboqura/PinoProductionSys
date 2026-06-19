"use client";

import { useMemo, useState, useTransition } from "react";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { previewProductionConsumptionWarnings } from "@/features/inventory/actions";
import type { ProductionConsumptionWarning } from "@/features/inventory/lib/production-consumption";
import type { WarehouseDto } from "@/features/inventory/types";
import { completeProductionOrder } from "@/features/production-orders/actions";

export function CompleteOrderButton({
  orderId,
  version,
  targetQuantity,
  unit,
  warehouses = [],
  sourceWarehouseId,
  sourceWarehouseName
}: {
  orderId: string;
  version: number;
  targetQuantity: string | null;
  unit: string;
  warehouses?: WarehouseDto[];
  sourceWarehouseId: string | null;
  sourceWarehouseName: string | null;
}) {
  const [quantity, setQuantity] = useState("");
  const [storageWarehouseId, setStorageWarehouseId] = useState("");
  const [legacySourceWarehouseId, setLegacySourceWarehouseId] = useState("");
  const [warnings, setWarnings] = useState<ProductionConsumptionWarning[]>([]);
  const [warningConfirmed, setWarningConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const warning = useMemo(() => {
    const target = Number(targetQuantity);
    const actual = Number(quantity);
    if (!target || !actual) return "";
    return Math.abs(actual - target) / target > 0.2 ? "Produced quantity differs from target by more than 20%." : "";
  }, [quantity, targetQuantity]);

  const complete = () =>
    startTransition(async () => {
      const result = await completeProductionOrder(orderId, Number(quantity), version, storageWarehouseId, sourceWarehouseId ?? legacySourceWarehouseId);
      setMessage(result.success ? `Order completed. Batch ${result.data.batchNumber} created.` : result.error);
      if (result.success) window.location.reload();
    });

  return (
    <div className="rounded-md border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold">Complete Order</h2>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-secondary">Produced quantity ({unit})</label>
          <Input
            className="w-48"
            min="0.001"
            step="0.001"
            type="number"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setWarnings([]);
              setWarningConfirmed(false);
            }}
          />
        </div>
        {sourceWarehouseId ? (
          <div className="grid gap-1">
            <span className="text-sm font-semibold text-secondary">Ingredient source warehouse</span>
            <span className="h-10 rounded-md border bg-background px-3 py-2 text-sm">{sourceWarehouseName}</span>
          </div>
        ) : (
          <div className="grid gap-1">
            <label className="text-sm font-semibold text-secondary">Ingredient source warehouse</label>
            <select
              className="h-10 w-56 rounded-md border px-3 text-sm"
              value={legacySourceWarehouseId}
              onChange={(event) => {
                setLegacySourceWarehouseId(event.target.value);
                setWarnings([]);
                setWarningConfirmed(false);
              }}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} - {warehouse.name}</option>)}
            </select>
          </div>
        )}
        {warehouses.length > 0 ? (
          <div className="grid gap-1">
            <label className="text-sm font-semibold text-secondary">Finished-product warehouse</label>
            <select
              className="h-10 w-56 rounded-md border px-3 text-sm"
              value={storageWarehouseId}
              onChange={(event) => {
                setStorageWarehouseId(event.target.value);
                setWarnings([]);
                setWarningConfirmed(false);
              }}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.code} - {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button
          disabled={isPending || !quantity}
          onClick={() =>
            startTransition(async () => {
              if (warehouses.length > 0 && !storageWarehouseId) {
                setMessage("Select the finished-product warehouse before completing the order.");
                return;
              }
              const consumptionWarehouseId = sourceWarehouseId ?? legacySourceWarehouseId;
              if (!consumptionWarehouseId) {
                setMessage("Select the ingredient source warehouse before completing the order.");
                return;
              }
              if (!warningConfirmed) {
                const preview = await previewProductionConsumptionWarnings(orderId, consumptionWarehouseId, Number(quantity));
                if (!preview.success) {
                  setMessage(preview.error.message);
                  return;
                }
                setWarnings(preview.data.warnings);
                if (preview.data.warnings.length > 0) {
                  setMessage("Review negative-stock warnings, then confirm.");
                  return;
                }
              }
              complete();
            })
          }
        >
          <PackageCheck className="h-4 w-4" />
          Complete Order
        </Button>
      </div>
      {warning ? <p className="mt-2 text-sm font-semibold text-warning">{warning}</p> : null}
      {warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4">
          <h3 className="font-bold">Negative Stock Warning</h3>
          <div className="mt-2 grid gap-2">
            {warnings.map((item) => (
              <div key={item.inventoryItemId} className="rounded-md bg-white p-3 text-sm">
                <div className="font-semibold">{item.code} - {item.name}</div>
                <div className="text-secondary">
                  Required {item.required} {item.unit}; current {item.current}; projected {item.projected}
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-3" variant="secondary" onClick={() => setWarningConfirmed(true)}>
            Confirm with Warning
          </Button>
          {warningConfirmed ? <p className="mt-2 text-sm font-semibold text-success">Warning confirmed. Complete the order to proceed.</p> : null}
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-secondary">{message}</p> : null}
    </div>
  );
}
