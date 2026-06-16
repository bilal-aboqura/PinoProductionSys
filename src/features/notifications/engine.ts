import { Prisma, type AlertRule, type NotificationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateNotificationInput } from "./types";

type DbClient = typeof prisma | Prisma.TransactionClient;

const preferenceFieldByCategory: Record<NotificationCategory, "inventoryAlerts" | "batchAlerts" | "productionAlerts" | "systemAlerts"> = {
  INVENTORY: "inventoryAlerts",
  WAREHOUSE: "inventoryAlerts",
  BATCH: "batchAlerts",
  PRODUCTION: "productionAlerts",
  SYSTEM: "systemAlerts"
};

export function evaluateThreshold(currentValue: number, threshold: number, mode: "below" | "lte" | "above" = "below") {
  if (mode === "above") return currentValue > threshold;
  if (mode === "lte") return currentValue <= threshold;
  return currentValue < threshold;
}

function numberParameter(rule: AlertRule, key: string, fallback: number) {
  const parameters = rule.parameters as Record<string, unknown>;
  const value = parameters?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function recipientIdsForRoles(db: DbClient, category: NotificationCategory, targetRoles: string[]) {
  if (targetRoles.length === 0) return [];
  const preferenceField = preferenceFieldByCategory[category];
  const users = await db.user.findMany({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: { in: targetRoles } } } }
    },
    select: {
      id: true,
      notificationPreference: true
    }
  });

  return users.filter((user) => user.notificationPreference?.[preferenceField] ?? true).map((user) => user.id);
}

export async function createNotificationForRoles(input: CreateNotificationInput, db: DbClient = prisma) {
  const userIds = await recipientIdsForRoles(db, input.category, input.targetRoles);
  if (userIds.length === 0) return null;

  return db.notification.create({
    data: {
      title: input.title,
      message: input.message,
      category: input.category,
      severity: input.severity,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      recipients: {
        createMany: {
          data: Array.from(new Set(userIds)).map((userId) => ({ userId })),
          skipDuplicates: true
        }
      }
    }
  });
}

export async function checkInventoryAlerts(inventoryItemId: string, db: DbClient = prisma) {
  const item = await db.inventoryItem.findUnique({
    where: { id: inventoryItemId },
    include: { balances: true }
  });
  if (!item || !item.isActive) return [];

  const currentQuantity = item.balances.reduce((sum, balance) => sum + Number(balance.currentQuantity), 0);
  const rules = await db.alertRule.findMany({
    where: { isEnabled: true, triggerType: { in: ["LOW_STOCK", "NEGATIVE_INVENTORY"] } }
  });
  const created = [];

  for (const rule of rules) {
    if (rule.triggerType === "LOW_STOCK") {
      const threshold = numberParameter(rule, "threshold", Number(item.minStockLevel));
      if (!evaluateThreshold(currentQuantity, threshold, "below")) continue;
      const notification = await createNotificationForRoles(
        {
          title: `Low Stock: ${item.nameEn || item.nameAr}`,
          message: `${item.nameEn || item.nameAr} is below its safety threshold (${currentQuantity} ${item.unit} remaining).`,
          category: rule.category,
          severity: rule.severity,
          relatedEntityType: "InventoryItem",
          relatedEntityId: item.id,
          targetRoles: rule.targetRoles
        },
        db
      );
      if (notification) created.push(notification);
    }

    if (rule.triggerType === "NEGATIVE_INVENTORY" && evaluateThreshold(currentQuantity, 0, "below")) {
      const notification = await createNotificationForRoles(
        {
          title: `Negative Inventory: ${item.nameEn || item.nameAr}`,
          message: `${item.nameEn || item.nameAr} has dropped below zero (${currentQuantity} ${item.unit}). Reconciliation is required.`,
          category: rule.category,
          severity: rule.severity,
          relatedEntityType: "InventoryItem",
          relatedEntityId: item.id,
          targetRoles: rule.targetRoles
        },
        db
      );
      if (notification) created.push(notification);
    }
  }

  return created;
}

export async function triggerProductionAlert(orderId: string, db: DbClient = prisma) {
  const order = await db.productionOrder.findUnique({ where: { id: orderId } });
  if (!order || order.durationSeconds == null) return [];

  const rules = await db.alertRule.findMany({ where: { isEnabled: true, triggerType: "PRODUCTION_DELAY" } });
  const created = [];
  for (const rule of rules) {
    const maxDurationMinutes = numberParameter(rule, "maxDurationMinutes", 120);
    if (!evaluateThreshold(Math.round(order.durationSeconds / 60), maxDurationMinutes, "above")) continue;
    const notification = await createNotificationForRoles(
      {
        title: `Production Delay: ${order.orderNumber}`,
        message: `${order.orderNumber} exceeded the configured duration threshold of ${maxDurationMinutes} minutes.`,
        category: rule.category,
        severity: rule.severity,
        relatedEntityType: "ProductionOrder",
        relatedEntityId: order.id,
        targetRoles: rule.targetRoles
      },
      db
    );
    if (notification) created.push(notification);
  }
  return created;
}

export async function pruneOldNotifications(retentionDays = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
