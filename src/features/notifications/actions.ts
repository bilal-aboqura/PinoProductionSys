"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { alertRuleUpdateSchema, notificationPreferenceSchema, parseRuleParameters } from "./validation";
import { toAlertRuleDTO } from "./queries";
import type { AlertRuleDTO, NotificationPreferenceDTO } from "./types";

function revalidateNotifications() {
  revalidatePath("/[locale]/notifications", "page");
  revalidatePath("/[locale]/profile/notifications", "page");
  revalidatePath("/[locale]/admin/alert-rules", "page");
}

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean }> {
  const session = await getServerSession();
  await prisma.notificationRecipient.update({
    where: { notificationId_userId: { notificationId, userId: session.user.id } },
    data: { isRead: true, readAt: new Date() }
  });
  revalidateNotifications();
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  const session = await getServerSession();
  await prisma.notificationRecipient.updateMany({
    where: { userId: session.user.id, isRead: false, isArchived: false },
    data: { isRead: true, readAt: new Date() }
  });
  revalidateNotifications();
  return { success: true };
}

export async function archiveNotification(notificationId: string): Promise<{ success: boolean }> {
  const session = await getServerSession();
  await prisma.notificationRecipient.update({
    where: { notificationId_userId: { notificationId, userId: session.user.id } },
    data: { isArchived: true, archivedAt: new Date(), isRead: true, readAt: new Date() }
  });
  revalidateNotifications();
  return { success: true };
}

export async function updateAlertRule(
  ruleId: string,
  data: { parameters: Record<string, unknown>; severity: "INFO" | "WARNING" | "CRITICAL"; isEnabled: boolean }
): Promise<{ success: boolean; rule?: AlertRuleDTO; error?: string }> {
  try {
    const session = await getServerSession();
    if (!session.user.permissions.includes("notifications:manage_rules")) {
      requirePermission(session, "system:configure");
    }
    const parsed = alertRuleUpdateSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "Invalid alert rule payload." };
    const rule = await prisma.alertRule.update({
      where: { id: ruleId },
      data: {
        parameters: parsed.data.parameters as Prisma.InputJsonObject,
        severity: parsed.data.severity,
        isEnabled: parsed.data.isEnabled,
        updatedById: session.user.id
      }
    });
    revalidateNotifications();
    return { success: true, rule: toAlertRuleDTO(rule) };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return { success: false, error: "Unauthorized." };
    if (error instanceof Error && error.message === "PERMISSION_DENIED") return { success: false, error: "Forbidden." };
    return { success: false, error: error instanceof Error ? error.message : "Unable to update alert rule." };
  }
}

export async function updateAlertRuleFromForm(formData: FormData) {
  const ruleId = String(formData.get("ruleId") ?? "");
  const parameters = parseRuleParameters(String(formData.get("parameters") ?? "{}"));
  if (!ruleId || !parameters) return;
  await updateAlertRule(ruleId, {
    parameters,
    severity: String(formData.get("severity") ?? "WARNING") as "INFO" | "WARNING" | "CRITICAL",
    isEnabled: formData.get("isEnabled") === "on"
  });
}

export async function updateNotificationPreferences(input: NotificationPreferenceDTO): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession();
    const parsed = notificationPreferenceSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "Invalid preference payload." };
    await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: parsed.data,
      create: { userId: session.user.id, ...parsed.data }
    });
    revalidateNotifications();
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return { success: false, error: "Unauthorized." };
    return { success: false, error: error instanceof Error ? error.message : "Unable to update preferences." };
  }
}

export async function updateNotificationPreferencesFromForm(formData: FormData) {
  await updateNotificationPreferences({
    inventoryAlerts: formData.get("inventoryAlerts") === "on",
    batchAlerts: formData.get("batchAlerts") === "on",
    productionAlerts: formData.get("productionAlerts") === "on",
    systemAlerts: formData.get("systemAlerts") === "on"
  });
}
