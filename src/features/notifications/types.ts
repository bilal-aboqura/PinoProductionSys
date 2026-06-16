import type { AlertTriggerType, NotificationCategory, NotificationSeverity } from "@prisma/client";

export type NotificationDTO = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
  isRead: boolean;
  isArchived: boolean;
};

export type AlertRuleDTO = {
  id: string;
  name: string;
  category: NotificationCategory;
  triggerType: AlertTriggerType;
  parameters: Record<string, unknown>;
  severity: NotificationSeverity;
  targetRoles: string[];
  isEnabled: boolean;
};

export type NotificationHistoryFilters = {
  category?: NotificationCategory;
  status?: "all" | "unread" | "read";
  page?: number;
  pageSize?: number;
};

export type NotificationPreferenceDTO = {
  inventoryAlerts: boolean;
  batchAlerts: boolean;
  productionAlerts: boolean;
  systemAlerts: boolean;
};

export type CreateNotificationInput = {
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  targetRoles: string[];
};
