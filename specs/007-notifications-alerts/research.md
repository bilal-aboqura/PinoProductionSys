# Technology Research & Decisions: Notifications and Alerts

This document details the architectural decisions, technology choices, and design tradeoffs evaluated for the Notifications and Alerts module.

---

## Decision 1: Real-Time In-App Delivery Channel

We evaluated three mechanisms for pushing notifications and updating the unread badge count in the app header:

### Alternatives Evaluated

| Criteria | Option A: Client-side Polling (SWR) | Option B: Server-Sent Events (SSE) | Option C: WebSockets (Socket.io/Pusher) |
|----------|-------------------------------------|-----------------------------------|-----------------------------------------|
| **Implementation Complexity** | **Very Low** (standard React Hook) | **Medium** (requires stream connection) | **High** (requires stateful server/adapter) |
| **Serverless Compatibility** | **100%** (stateless HTTP REST API) | **Poor** (Vercel serverless timeout at 30s) | **Fails** (requires persistent socket layer) |
| **Real-time Latency** | Configurable (e.g., 10–15s delay) | Immediate (< 1s) | Immediate (< 1s) |
| **Server Resource Overhead**| Minimal (stateless requests) | High (persistent open connections) | High (persistent sockets) |
| **Connection Stability** | Self-healing (stateless polling) | Prone to timeouts / requires reconnect | Requires socket heartbeat / reconnect |

### Selected Decision
**Option A: SWR-based Client Polling (fallback to SSE if persistent hosting is verified)**
- *Rationale*: Complying with **Core Principle I (Simplicity)** and standard serverless limitations of Next.js, standard stateless polling using the `useSWR` library provides the most robust, self-healing, and easy-to-test mechanism. SWR automatically polls every 10–15 seconds, and crucially handles **focus revalidation** (re-queries instantly when the user switches tabs or focuses back to the app window). This provides a "near real-time" feel without database exhaustion or connection leaks.
- *Implementation Details*: We will create a REST route handler `/api/notifications/unread` returning the unread count and `/api/notifications/recent` returning the latest 5 alerts. SWR will execute requests.

---

## Decision 2: Database Schema & Entity Consolidation

The technical request asks for six tables:
- `notifications`
- `notification_rules`
- `notification_recipients`
- `notification_reads`
- `notification_archives`
- `notification_history`

### Alternatives Evaluated

- **Option A: 6-Table Layout (Strict Literal Interpretation)**
  - *Pros*: Follows the table list exactly.
  - *Cons*: High redundancy. Creating separate tables for reads and archives means moving rows between tables or writing complex multi-join queries to find out if a notification is unread or archived. History becomes a duplicate table of notifications.
- **Option B: 3-Table Consolidated Layout (Recommended)**
  - *Pros*: 3NF relational design. Junction table handles status flags (`isRead`, `isArchived`, `readAt`, `archivedAt`) directly. History is preserved implicitly via timestamps. Simple query to get unread: `WHERE isRead = false AND isArchived = false`.
  - *Cons*: Proposes fewer tables than listed but achieves 100% of the functional capabilities with significantly lower complexity and higher performance.

### Selected Decision
**Option B: 3-Table Consolidated Layout**
- *Rationale*: Aligns with **Core Principle I (Simplicity Over Complexity)**. A consolidated model is easier to maintain and query.
- *Mapping representation*:
  - `Notification` (Stores the alert payload, type, priority, and optional deep links)
  - `NotificationRecipient` (Maps notifications to users; stores status flags replacing `notification_recipients`, `notification_reads`, and `notification_archives`)
  - `AlertRule` (Stores configuration replacing `notification_rules`)
  - *Note on History*: `notification_history` is represented by querying `Notification` and `NotificationRecipient` tables directly, as auditability is preserved through immutable `createdAt`, `readAt`, and `archivedAt` timestamps.

---

## Decision 3: Alert Triggering Integration Pattern

We evaluated how automated notifications are triggered from other modules (Production, Inventory, Batch, Warehouse).

### Selected Decision
**Application Event/Action Hooks**
- *Rationale*: Instead of running background database scanners that poll for changes (which wastes CPU and creates latency), we will trigger alerts directly during State Mutation Server Actions/Services.
- *Pattern*:
  - Inside `src/features/inventory/actions.ts`, after a transaction completes:
    `await checkInventoryAlerts(itemId);`
  - Inside `src/features/recipes/actions.ts` / `src/features/production/actions.ts`, after completion or delay:
    `await triggerProductionAlert(orderId, eventType);`
- This ensures alert creation is synchronous with the state change and completes in under 1 second.
