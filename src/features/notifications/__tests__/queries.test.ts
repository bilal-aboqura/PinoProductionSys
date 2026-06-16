import { describe, expect, it } from "vitest";
import { evaluateThreshold } from "../engine";
import { toNotificationDTO } from "../queries";
import { resolveNotificationHref } from "../utils";

describe("notification query helpers", () => {
  it("maps notification recipient rows to API DTOs", () => {
    const createdAt = new Date("2026-06-15T12:00:00.000Z");
    const dto = toNotificationDTO({
      notificationId: "notif_1",
      userId: "user_1",
      isRead: false,
      readAt: null,
      isArchived: false,
      archivedAt: null,
      notification: {
        id: "notif_1",
        title: "Low Stock",
        message: "Flour is below minimum stock.",
        category: "INVENTORY",
        severity: "WARNING",
        relatedEntityType: "InventoryItem",
        relatedEntityId: "item_1",
        createdAt
      }
    });

    expect(dto).toEqual({
      id: "notif_1",
      title: "Low Stock",
      message: "Flour is below minimum stock.",
      category: "INVENTORY",
      severity: "WARNING",
      relatedEntityType: "InventoryItem",
      relatedEntityId: "item_1",
      createdAt: "2026-06-15T12:00:00.000Z",
      isRead: false,
      isArchived: false
    });
  });

  it("evaluates configured threshold modes", () => {
    expect(evaluateThreshold(9, 10)).toBe(true);
    expect(evaluateThreshold(10, 10)).toBe(false);
    expect(evaluateThreshold(10, 10, "lte")).toBe(true);
    expect(evaluateThreshold(121, 120, "above")).toBe(true);
  });

  it("resolves related entities to operational routes", () => {
    expect(resolveNotificationHref("en", "InventoryItem", "item_1")).toBe("/en/inventory/items?item=item_1");
    expect(resolveNotificationHref("ar", "ProductionOrder", "order_1")).toBe("/ar/production/order_1");
    expect(resolveNotificationHref("en", null, null)).toBe("/en/notifications");
  });
});
