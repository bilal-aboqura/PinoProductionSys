# Production Completion Inventory Integration

When a production order is ready to complete, the UI can call:

```ts
previewProductionConsumptionWarnings(productionOrderId, sourceWarehouseId)
```

The action returns `ProductionConsumptionWarning[]` from `src/features/inventory/lib/production-consumption.ts`. If the array is not empty, the production UI must show the affected item, current stock, required quantity, projected stock, and a `Confirm with Warning` control before completion continues.

After the production order is completed and an output warehouse/finished item are known, the integration action is:

```ts
completeProductionOrderInventory({
  productionOrderId,
  sourceWarehouseId,
  outputWarehouseId,
  itemId,
  quantity
})
```

This action runs inventory consumption and finished output posting in one transaction, writes stock movements, writes consumption/output logs, and flags balances that go negative for reconciliation.
