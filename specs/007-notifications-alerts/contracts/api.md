# Interface Contracts: Notifications and Alerts

This document defines the TypeScript interfaces, Next.js Server Actions, and REST API contracts for the Notifications and Alerts module.

---

## 1. Data Transfer Objects (DTOs)

```typescript
export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  category: 'PRODUCTION' | 'INVENTORY' | 'BATCH' | 'WAREHOUSE' | 'SYSTEM';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string; // ISO 8601 string
  isRead: boolean;
  isArchived: boolean;
}

export interface AlertRuleDTO {
  id: string;
  name: string;
  category: 'PRODUCTION' | 'INVENTORY' | 'BATCH' | 'WAREHOUSE' | 'SYSTEM';
  triggerType: 'LOW_STOCK' | 'NEGATIVE_INVENTORY' | 'NEAR_EXPIRY' | 'EXPIRED_BATCH' | 'PRODUCTION_DELAY';
  parameters: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  targetRoles: string[];
  isEnabled: boolean;
}
```

---

## 2. REST API Endpoints (For Client-side SWR Polling)

### GET `/api/notifications/unread`
- **Description**: Returns the count of unread, non-archived notifications for the logged-in user.
- **Headers**: Requires active session cookie.
- **Response**: `200 OK`
  ```json
  {
    "count": 3
  }
  ```

### GET `/api/notifications/recent`
- **Description**: Returns the 5 most recent unread or read (but not archived) notifications for the user.
- **Headers**: Requires active session cookie.
- **Response**: `200 OK`
  ```json
  {
    "notifications": [
      {
        "id": "notif_123",
        "title": "Low Stock Alert: Flour",
        "message": "Stock of Flour has fallen below safety threshold (10kg remaining).",
        "category": "INVENTORY",
        "severity": "WARNING",
        "relatedEntityType": "InventoryItem",
        "relatedEntityId": "item_flour",
        "createdAt": "2026-06-15T12:00:00.000Z",
        "isRead": false,
        "isArchived": false
      }
    ]
  }
  ```

### POST `/api/internal/notification-cleanup`
- **Description**: Secure internal API to purge notifications older than 90 days. Intended to be invoked via VPS Linux cron.
- **Headers**:
  - `Authorization: Bearer <CLEANUP_TOKEN>` (token configured in `.env`)
- **Response**:
  - `200 OK` on success: `{ "success": true, "purgedCount": 142 }`
  - `401 Unauthorized` on missing/invalid token: `{ "error": "Unauthorized" }`

---

## 3. Next.js Server Actions (Mutations)

All Server Actions check session authentication and RBAC permissions before execution.

### `markNotificationRead`
- **Signature**: `export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }>`
- **Behavior**: Marks a single notification as read for the logged-in user.

### `markAllNotificationsRead`
- **Signature**: `export async function markAllNotificationsRead(): Promise<{ success: boolean }>`
- **Behavior**: Marks all notifications as read for the logged-in user.

### `archiveNotification`
- **Signature**: `export async function archiveNotification(notificationId: string): Promise<{ success: boolean }>`
- **Behavior**: Marks a notification as archived (removed from active lists) for the logged-in user.

### `updateAlertRule`
- **Signature**:
  ```typescript
  export async function updateAlertRule(
    ruleId: string, 
    data: { parameters: Record<string, any>; severity: 'INFO' | 'WARNING' | 'CRITICAL'; isEnabled: boolean }
  ): Promise<{ success: boolean; rule?: AlertRuleDTO; error?: string }>
  ```
- **Permission required**: `admin:rules` or `supervisor:rules`
- **Behavior**: Updates thresholds and toggles for an alert rule in `alert_rules`. Logs action to system audit log.
