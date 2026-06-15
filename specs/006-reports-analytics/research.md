# Research & Technology Decisions: Reports & Analytics

This document outlines the architectural research, library options, and design decisions for the restaurant production platform's reporting and analytics module.

---

## 1. Excel Generation Library

### Decision
Use the `exceljs` library.

### Rationale
- **Performance**: High performance for streaming large datasets (useful for datasets > 500 rows).
- **Formatting Support**: Provides full programmatic control over styling (colors, borders, fonts), alignment, column auto-widths, merged cells, headers/footers, and formulas.
- **Compatibility**: Runs seamlessly in Server Actions and Route Handlers within Next.js 15.

### Alternatives Considered
- **SheetJS (xlsx)**: The open-source community version lacks formatting and style customizability (requires a paid Pro license for advanced styling), which violates our requirement for premium brand-consistent layouts.
- **csv-writer**: Does not support `.xlsx` formats, formulas, tabs, or styled sheets. Explicitly rejected because Excel format is a core user requirement for pivot tables and operational filtering.

---

## 2. PDF Generation Library

### Decision
Use `pdfkit` in combination with server-side layout streaming.

### Rationale
- **Flexibility**: Lightweight, high-precision layout controls (draw lines, custom grids, table drawing, embedded fonts).
- **Security & Privacy**: Generates PDFs entirely in the server-side memory space, preventing sensitive user credentials or production recipe data from leaking to external rendering APIs.
- **Memory Footprint**: Extremely small memory footprint compared to starting a headless browser instance.

### Alternatives Considered
- **Puppeteer/Chromium Headless**: Spawns a headless browser to print pages to PDF. Extremely resource-heavy, slow, and hard to run reliably in serverless environments (violates performance standards of < 10 seconds export time).
- **Third-Party PDF APIs**: High cost, introduces external dependencies, and exposes internal restaurant operations data over public networks.

---

## 3. Database Views Strategy

### Decision
Define read-only PostgreSQL views (`production_summary_view`, `inventory_summary_view`, `batch_summary_view`, `waste_summary_view`, `staff_performance_view`) in Supabase, and expose them as Prisma models using `@readonly` mappings or `$queryRaw` queries.

### Rationale
- **Decoupled Logic**: Moves complex mathematical aggregations (e.g. average completion times, yield-to-waste percentages, historical logs) into optimized database queries rather than doing JavaScript map-reduce in the API layer.
- **Indexing & Performance**: Views execute directly on the database engine. They utilize standard indexes on foreign keys and date ranges (`createdAt`, `expiryDate`), keeping dashboard response times below 300ms.
- **Maintainability**: Standardized tables are easy to query from multiple reports without rewriting complex Prisma includes.

### Alternatives Considered
- **Raw JavaScript Aggregation**: Pulling large datasets from PostgreSQL and aggregating in Node.js memory. This causes massive memory spikes, slows API response times, and breaks the 5-second report load standard.

---

## 4. Scheduled Reports & Archiving

### Decision
Utilize PostgreSQL PG-Boss or a simple crontab trigger executing a Next.js API Route Handler. Generated reports are exported to a Supabase Storage bucket (`reports-archive`) and recorded in a `ReportArchive` table.

### Rationale
- Fits perfectly within the existing Supabase storage architecture.
- Simple, stateless execution compatible with serverless architecture.
- Allows on-demand downloads and provides an immutable archive history for compliance/audit trails.

### Alternatives Considered
- **Local File System Storage**: Fails on serverless deployments (Vercel) due to ephemeral storage.
- **Email Delivery Only**: Deferred for future versions due to setup complexity and the risk of silent delivery failures. An on-demand dashboard archive is more reliable for V1.
