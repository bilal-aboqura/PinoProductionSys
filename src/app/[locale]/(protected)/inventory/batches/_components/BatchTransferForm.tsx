"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transferBatchBetweenWarehousesAction } from "@/features/batches/actions";
import type { WarehouseDto } from "@/features/inventory/types";

export function BatchTransferForm({
  batchId,
  containerId,
  productName,
  sourceWarehouseName,
  quantity,
  unit,
  destinationWarehouses
}: {
  batchId: string;
  containerId?: string;
  productName: string;
  sourceWarehouseName: string;
  quantity: string;
  unit: string;
  destinationWarehouses: WarehouseDto[];
}) {
  const allowPartialTransfer = Boolean(containerId);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState(quantity);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="rounded-md border bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");
        startTransition(async () => {
          const result = await transferBatchBetweenWarehousesAction({
            batchId,
            containerId,
            quantity: allowPartialTransfer ? Number(transferQuantity) : undefined,
            destinationWarehouseId,
            notes
          });
          if (!result.success) {
            setMessage(result.error.message);
            return;
          }
          setMessage(`Transfer recorded to ${result.data.destinationWarehouseName}. Refreshing...`);
          window.location.reload();
        });
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Transfer Finished Product</h2>
          <p className="mt-1 text-sm text-secondary">Move this scanned production stock directly from the barcode page.</p>
        </div>
        <BadgeLike label={`${quantity} ${unit}`} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Product" value={productName} />
        <Field label="Source" value={sourceWarehouseName} />
        <label className="grid gap-1 text-sm font-semibold text-secondary">
          Destination
          <select
            className="h-10 rounded-md border bg-white px-3 text-sm text-foreground"
            value={destinationWarehouseId}
            onChange={(event) => setDestinationWarehouseId(event.target.value)}
            required
          >
            <option value="">Select warehouse</option>
            {destinationWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} - {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        {allowPartialTransfer ? (
          <label className="grid gap-1 text-sm font-semibold text-secondary">
            Transfer quantity ({unit})
            <input
              className="h-10 rounded-md border px-3 text-sm text-foreground"
              min="0.001"
              max={quantity}
              step="0.001"
              type="number"
              value={transferQuantity}
              onChange={(event) => setTransferQuantity(event.target.value)}
              required
            />
          </label>
        ) : (
          <Field label="Transfer quantity" value={`${quantity} ${unit}`} />
        )}
      </div>
      <label className="mt-3 grid gap-1 text-sm font-semibold text-secondary">
        Notes
        <input
          className="h-10 rounded-md border px-3 text-sm text-foreground"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          placeholder="Optional transfer notes"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending || !destinationWarehouseId || (allowPartialTransfer && !transferQuantity)}>
          <ArrowRightLeft className="h-4 w-4" />
          {isPending ? "Transferring..." : "Transfer"}
        </Button>
        <p className="text-sm text-secondary">
          {allowPartialTransfer
            ? "If you transfer less than the remaining amount, the system will split the container automatically."
            : "This batch will be moved in full because it is not split into containers yet."}
        </p>
      </div>
      {message ? <p className="mt-3 text-sm font-semibold text-secondary">{message}</p> : null}
    </form>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-sm font-semibold text-secondary">{label}</span>
      <span className="h-10 rounded-md border bg-background px-3 py-2 text-sm">{value}</span>
    </div>
  );
}

function BadgeLike({ label }: { label: string }) {
  return <span className="inline-flex items-center rounded-sm bg-accent px-2 py-1 text-xs font-semibold text-secondary">{label}</span>;
}
