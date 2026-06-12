"use server";

import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/server/db";
import type { AuditLogFilters, AuditLogResult } from "./types";

export async function getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
  const session = await getServerSession();
  requirePermission(session, "audit:view");

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 50));
  const where = {
    ...(filters.targetUsername
      ? {
          OR: [
            { targetName: { contains: filters.targetUsername, mode: "insensitive" as const } },
            { actorName: { contains: filters.targetUsername, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.fromDate || filters.toDate
      ? {
          createdAt: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lte: filters.toDate } : {})
          }
        }
      : {})
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    db.auditLog.count({ where })
  ]);

  return {
    success: true,
    data: {
      logs: logs.map((log) => ({
        id: log.id,
        actorName: log.actorName,
        targetName: log.targetName,
        action: log.action,
        previousValue: log.previousValue as Record<string, unknown> | null,
        newValue: log.newValue as Record<string, unknown> | null,
        createdAt: log.createdAt.toISOString()
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}
