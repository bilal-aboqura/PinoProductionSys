import type { AuditAction as PrismaAuditAction } from "@prisma/client";

export type AuditAction = PrismaAuditAction;

export type AuditEvent = {
  actorId: string;
  actorName: string;
  targetId?: string | null;
  targetName?: string | null;
  action: AuditAction;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditLogEntry = {
  id: string;
  actorName: string;
  targetName: string | null;
  action: AuditAction;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
};

export type AuditLogFilters = {
  targetUsername?: string;
  action?: AuditAction;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
};

export type AuditLogResult = {
  success: true;
  data: {
    logs: AuditLogEntry[];
    total: number;
    page: number;
    totalPages: number;
  };
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  USER_ACTIVATED: "User activated",
  USER_DEACTIVATED: "User deactivated",
  ROLE_ASSIGNED: "Role assigned",
  ROLE_REMOVED: "Role removed",
  SCOPE_ASSIGNED: "Scope assigned",
  SCOPE_REMOVED: "Scope removed",
  PERMISSION_CHANGED: "Permission changed",
  PASSWORD_RESET: "Password reset",
  PASSWORD_CHANGED: "Password changed",
  LOGIN_SUCCESS: "Login success",
  LOGIN_FAILED: "Login failed",
  LOGOUT: "Logout"
};
