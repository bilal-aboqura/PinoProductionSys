import { db } from "@/server/db";
import type { AuditEvent } from "@/features/audit/types";
import { Prisma } from "@prisma/client";

const sensitiveKeys = new Set(["password", "passwordHash", "currentPassword", "newPassword", "confirmPassword"]);

function sanitize(value: Record<string, unknown> | null | undefined): Prisma.InputJsonObject | null {
  if (!value) {
    return null;
  }

  return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitiveKeys.has(key))) as Prisma.InputJsonObject;
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    await db.auditLog.create({
      data: {
        actorId: event.actorId,
        actorName: event.actorName,
        targetId: event.targetId ?? null,
        targetName: event.targetName ?? null,
        action: event.action,
        previousValue: sanitize(event.previousValue) ?? Prisma.JsonNull,
        newValue: sanitize(event.newValue) ?? Prisma.JsonNull,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null
      }
    });
  } catch (error) {
    console.error("Audit logging failed", error);
  }
}
