import { Prisma, type AlertRule, type Notification, type NotificationRecipient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AlertRuleDTO, NotificationDTO, NotificationHistoryFilters, NotificationPreferenceDTO } from "./types";

type RecipientWithNotification = NotificationRecipient & { notification: Notification };

export function toNotificationDTO(row: RecipientWithNotification): NotificationDTO {
  return {
    id: row.notificationId,
    title: row.notification.title,
    message: row.notification.message,
    category: row.notification.category,
    severity: row.notification.severity,
    relatedEntityType: row.notification.relatedEntityType,
    relatedEntityId: row.notification.relatedEntityId,
    createdAt: row.notification.createdAt.toISOString(),
    isRead: row.isRead,
    isArchived: row.isArchived
  };
}

export function toAlertRuleDTO(rule: AlertRule): AlertRuleDTO {
  return {
    id: rule.id,
    name: rule.name,
    category: rule.category,
    triggerType: rule.triggerType,
    parameters: rule.parameters && typeof rule.parameters === "object" && !Array.isArray(rule.parameters) ? (rule.parameters as Record<string, unknown>) : {},
    severity: rule.severity,
    targetRoles: rule.targetRoles,
    isEnabled: rule.isEnabled
  };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notificationRecipient.count({
    where: { userId, isRead: false, isArchived: false }
  });
}

export async function getRecentNotifications(userId: string, take = 5) {
  const rows = await prisma.notificationRecipient.findMany({
    where: { userId, isArchived: false },
    include: { notification: true },
    orderBy: { notification: { createdAt: "desc" } },
    take
  });
  return rows.map(toNotificationDTO);
}

export async function getNotificationHistory(userId: string, filters: NotificationHistoryFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 20));
  const where: Prisma.NotificationRecipientWhereInput = {
    userId,
    isArchived: false,
    notification: filters.category ? { category: filters.category } : undefined
  };

  if (filters.status === "read") where.isRead = true;
  if (filters.status === "unread") where.isRead = false;

  const [totalCount, rows] = await Promise.all([
    prisma.notificationRecipient.count({ where }),
    prisma.notificationRecipient.findMany({
      where,
      include: { notification: true },
      orderBy: { notification: { createdAt: "desc" } },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
  ]);

  return {
    rows: rows.map(toNotificationDTO),
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
  };
}

export async function getAlertRules() {
  const rules = await prisma.alertRule.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return rules.map(toAlertRuleDTO);
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferenceDTO> {
  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
  return {
    inventoryAlerts: preferences.inventoryAlerts,
    batchAlerts: preferences.batchAlerts,
    productionAlerts: preferences.productionAlerts,
    systemAlerts: preferences.systemAlerts
  };
}
