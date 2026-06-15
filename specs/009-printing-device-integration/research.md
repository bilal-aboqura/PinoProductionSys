# Research and Technology Decisions: Printing and Device Integration

## 1. Browser-Based HTML/CSS Label Printing

### Decision
Generate print-ready labels using standard HTML/CSS web layouts rendered on dedicated, isolated print pages, and styled with `@media print` directives for exact metric scaling.

### Rationale
- Rendering HTML elements (text, tables, borders) and inline SVGs/Canvas for QR codes is natively supported by all modern browsers (Chrome, Edge).
- Custom `@media print` CSS rules specify the exact paper dimensions (50x50mm, 100x50mm, 100x100mm) and remove margins, headers, and footers.
- Reusing standard web styling keeps development simple, ensures Arabic text (Cairo font) renders with perfect alignment, and avoids generating raw ZPL/ESC-POS text streams which are highly hardware-specific.
- PDF generation (using the same templates) is provided as an administrative export fallback.

### Alternatives Considered
- **Direct ZPL/EPL Command Delivery**: Rejected because it requires installing local background agent/bridge software on client PCs to establish direct hardware port connections.
- **Server-Side PDF-only Printing**: Rejected because rendering PDFs on the server for every quick print introduces significant server CPU overhead compared to client-side HTML print previews.

---

## 2. Keyboard-Emulation Scanner Input Handling

### Decision
Integrate barcode/QR scanners operating in keyboard emulation mode using global keypress listeners in React.

### Rationale
- Most industrial scanners (USB/Bluetooth) can be configured to act as input devices (keyboard wedge). When a code is scanned, characters are sent as standard keyboard events followed by an `Enter` key signal.
- A React hook (`useKeyboardScanner`) will listen to global key events, measure inter-character entry speed (scanners input text in <50ms, much faster than human typing), buffer the input, and invoke a lookup action automatically when the trailing `Enter` is detected.
- This approach requires no browser permissions, works across all operating systems, and handles background scans without requiring a text input field to have active focus.

### Alternatives Considered
- **Web Serial / Web Bluetooth APIs**: Rejected because they require explicit user permission prompt approvals, are not supported by all browsers, and restrict hardware models.

---

## 3. Print Queue & Reprint Tracking

### Decision
Store print activities in structured tables (`print_jobs`, `print_history`, `print_reprints`) in PostgreSQL. Every reprint request is link-gated to an existing job and requires submitting an audit-logged reason.

### Rationale
- Strict auditing is required for traceability.
- Tracking printer queues (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) allows warehouse operators to monitor print statuses and rerun failed jobs.
- Immutability is enforced by allowing only `INSERT` and `UPDATE` (status transitions) queries, with delete queries strictly blocked on print logs.
