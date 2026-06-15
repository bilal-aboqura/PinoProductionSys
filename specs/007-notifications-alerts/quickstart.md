# Quickstart & Verification Guide: Notifications and Alerts

This guide details how to verify that the Notifications and Alerts system is working correctly.

---

## 1. Prerequisites

Before running verification, ensure the following are completed:
- Prisma migration is applied to add the notifications models defined in [data-model.md](data-model.md).
- Database contains seed data representing roles (`Administrator`, `Supervisor`, `Warehouse Staff`, `Production Staff`) and active users.
- Database contains at least one inventory item, one active batch, and one production order for testing.

---

## 2. Test Setup & Seeding

We will write a test seed script to verify rule triggers. 

Run the following command to apply schema changes and update the Prisma client:
```bash
npx prisma db push
```

Run the following command to populate default rules in the database:
```bash
npx tsx prisma/seed.ts
```

---

## 3. Verification Scenarios

### Scenario A: Verify Low Stock Alert Trigger
1. **Prerequisite**: An inventory item exists (e.g. "Flour") with a safety stock limit of 50 units and a current quantity of 60 units.
2. **Action**: Create a stock transaction or edit the item to adjust the stock quantity down to 45 units.
3. **Execution**:
   - The inventory action handler triggers `checkInventoryAlerts("item_flour")`.
   - The rules engine detects `45 < 50` and inserts a `Notification` mapped to the `Warehouse Staff` and `Supervisor` roles.
4. **Validation**:
   - Log in as a user with the `Warehouse Staff` role.
   - Verify that the notification badge count increments by 1.
   - Open the notification bell dropdown and confirm a warning alert: *"Low Stock: Flour is below safety limit (45 remaining)"*.

### Scenario B: Verify Real-Time In-App Updates
1. **Action**: Open the platform in two different browser sessions (Session A: logged in as a supervisor; Session B: logged in as kitchen staff).
2. **Execution**: In Session B, start a production order that has been marked as overdue.
3. **Validation**:
   - Verify that Session A (Supervisor) immediately shows an in-app toast notification for the overdue order starting and the unread notification counter badge increments.
   - Verify that Session B (Kitchen Staff) does *not* receive a notification if their role preferences or rules exclude them from this notification.

### Scenario C: Verify Notification Read and Archive Actions
1. **Action**: Log in and open the [Notification History page](file:///f:/CodingProjects/PinoProductionSys/specs/007-notifications-alerts/spec.md#user-story-2---role-based-notification-history-priority-p1).
2. **Execution**:
   - Click "Mark as Read" on a notification.
   - Click "Archive" on another notification.
3. **Validation**:
   - The unread badge count updates dynamically.
   - The read notification transitions visually to the read style (e.g., normal text weight instead of bold).
   - The archived notification is removed from the active history list, and its status is verified in the database as `isArchived = true`.

---

## 4. Automated Tests

Run the following commands to execute unit and integration test suites once implemented:

```bash
# Run rules engine unit tests
npx vitest run src/features/notifications/__tests__/engine.test.ts

# Run E2E notification delivery integration tests
npx playwright test tests/integration/notifications.spec.ts
```
