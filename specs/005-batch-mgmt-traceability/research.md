# Research: Batch Management, QR Code, and Label Printing

**Feature**: `005-batch-mgmt-traceability`  
**Phase**: 0 — Outline & Research  
**Date**: 2026-06-13

---

## 1. QR Code Generation

* **Decision**: Use the `qrcode` library on the server side to generate Base64-encoded Data URLs (`image/png`) and render them inside standard HTML image elements.
* **Rationale**: 
  * The `qrcode` package is lightweight, mature, and has zero external dependencies.
  * Server-side generation prevents layout shifting on the client and ensures that the QR code is immediately visible in the initial print view.
  * Encoded URLs can be easily embedded inside print-optimized HTML templates.
* **Alternatives Considered**: 
  * *External QR Code APIs (e.g., Google Charts)*: Rejected due to offline-capability issues (violates Constitution Principle V and VI) and privacy requirements (batch URLs should not leak to external APIs).
  * *Client-Side Canvas/SVG generation*: Rejected because canvas rendering is sometimes flaky when executing browser print actions before canvas load completes.

---

## 2. Label Printing and PDF Generation

* **Decision**: Implement print-optimized HTML templates styled with CSS (`@media print` rules) and standard CSS units (mm) representing the label dimensions.
* **Rationale**: 
  * Browser-native print functionality is highly reliable, supports standard thermal label printers (Zebra, Brother, etc.), and avoids the overhead of installing server-side PDF compilers.
  * By defining `@media print` rules with container breaks (`page-break-inside: avoid; page-break-after: always;`), we can support both single-label and bulk-label printing natively through the browser's print preview dialog.
  * Standard layout presets (50x50mm, 100x50mm, 100x100mm) will be styled in CSS to ensure exact fit without clipping.
* **Alternatives Considered**: 
  * *Server-Side PDF generation (e.g., pdfmake, puppeteer)*: Rejected because it adds significant memory footprint, requires backend file storage, and is slow (exceeds the 2-second label generation performance goal).
  * *React-PDF Renderer*: Rejected as an unnecessary abstraction for simple labels that can be natively formatted using standard CSS.

---

## 3. Batch Number Generation Strategy

* **Decision**: Auto-generate sequential identifiers matching `B-YYYY-NNNNN` where `YYYY` is the current year and `NNNNN` is a zero-padded 5-digit sequence.
* **Rationale**: 
  * Human-readable and chronologically sortable.
  * To guarantee uniqueness under concurrent requests, the system will use a raw PostgreSQL database transaction that reads the maximum sequence for the current year with a row lock (`SELECT FOR UPDATE` or mapping in an atomic transaction) or uses a sequence.
* **Alternatives Considered**: 
  * *UUIDs*: Rejected because they are not human-readable on a small label.
  * *B-YYYYMMDD-[Sequence]*: Rejected because daily sequences reset too often, making it harder to track yearly totals at a glance.

---

## 4. Container Management

* **Decision**: Introduce a secondary model `BatchContainer` that splits a parent `ProductionBatch` quantity. Each container receives a unique sub-identifier (e.g., `B-YYYY-NNNNN-C[Index]`) and its own printable label/QR.
* **Rationale**: 
  * Kitchens often produce large quantities (e.g., 20kg dough) and split them into smaller containers for cold-room storage.
  * Storing containers as child records keeps the parent batch as the singular production run ledger (linking to the recipe and staff), while allowing warehouse staff to manage container-level inventory movements.
* **Alternatives Considered**: 
  * *Flat structure (Multiple batches)*: Rejected because completing a single production order would require generating multiple distinct batch IDs, cluttering the traceability logs.
