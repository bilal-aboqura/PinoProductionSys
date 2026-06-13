# Research & Design Decisions: Inventory Management & Material Consumption

This document outlines the core technical research and design decisions for the Inventory Management module.

---

## Decision 1: Database Locks & Concurrency for Stock Balances

* **Decision**: Use PostgreSQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) during all inventory updates (deductions, additions, transfers, and adjustments).
* **Rationale**: Multiple operations (kitchen consumption, manual adjustments, transfers) can happen concurrently for the same inventory item in the same warehouse. To avoid race conditions (e.g., double-transferring stock or concurrent updates overwriting each other), the balance row must be locked during the transaction.
* **Alternatives Considered**: 
  * *On-the-fly summing*: Recalculating stock level on every page load by summing all ledger entries. Rejected due to poor performance as history grows.
  * *Optimistic Locking*: Using a version column. Rejected because it throws user-facing errors on concurrent updates, forcing user retries in a fast-paced kitchen environment.

---

## Decision 2: Cached Balances vs. Ledger Source of Truth

* **Decision**: Maintain a dual-write model: write an immutable ledger entry (`inventory_movements`) and update a cached state table (`inventory_balances`) within the same database transaction.
* **Rationale**: Meeting the performance requirement of loading the stock levels page in under 500ms requires direct access to pre-calculated balances. The `inventory_balances` table serves as this cache, while `inventory_movements` provides the audit trail.
* **Verification**: A nightly automated check (or admin utility) compares `SUM(quantity_delta) FROM inventory_movements` against `inventory_balances.quantity` to flag any discrepancy.

---

## Decision 3: Unit Conversion Helper

* **Decision**: Implement a backend utility `convertUnit(value: Decimal, from: Unit, to: Unit): Decimal` supporting compatible unit conversions:
  * Weight: `KG` <-> `GRAM` (Factor: 1000)
  * Volume: `LITER` <-> `MILLILITER` (Factor: 1000)
  * Piece: `PIECE` <-> `PIECE` (No conversion)
* **Rationale**: Recipe specifications might denote ingredients in grams for precision, while warehouses track inventory in bulk kilograms. The inventory system must convert these automatically during production order completion. Incompatible conversions (e.g., kilograms to liters) will fail validation and block completion.

---

## Decision 4: Integration with Production Orders completion

* **Decision**: The `ProductionOrder` completion flow in `003-production-orders` will call a dedicated internal inventory service function: `consumeInventoryForProduction(productionOrderId: string, tx: PrismaClient)`.
* **Rationale**: Keeping inventory logic encapsulated within the inventory feature module. By passing the Prisma transaction (`tx`) from the calling Production Order action, the entire database transaction remains atomic—if the stock updates fail or throw an error, the production order completion rolls back.

---

## Decision 5: User Location Scoping (UserInventoryArea)

* **Decision**: Map the existing `UserInventoryArea` join table to represent user assignments to Warehouses (since `InventoryArea` in schema corresponds to physical warehouses).
* **Rationale**: The database schema already defines `InventoryArea` and `UserInventoryArea`. We will treat each `InventoryArea` as a physical Warehouse and enforce that non-admin users must have an entry in `UserInventoryArea` for a warehouse to perform adjustments, transfers (from), or complete production consumption.
