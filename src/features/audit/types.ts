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
  LOGOUT: "Logout",
  RECIPE_CREATED: "Recipe created",
  DRAFT_SAVED: "Recipe draft saved",
  PUBLISHED: "Recipe published",
  ARCHIVED: "Recipe archived",
  RESTORED: "Recipe restored",
  INGREDIENT_ADDED: "Recipe ingredient added",
  INGREDIENT_UPDATED: "Recipe ingredient updated",
  INGREDIENT_REMOVED: "Recipe ingredient removed",
  STEP_ADDED: "Recipe step added",
  STEP_UPDATED: "Recipe step updated",
  STEP_REMOVED: "Recipe step removed",
  CATEGORY_CREATED: "Recipe category created",
  CATEGORY_CHANGED: "Recipe category changed",
  CATEGORY_ARCHIVED: "Recipe category archived",
  RECIPE_SCOPE_ASSIGNED: "Recipe scope assigned",
  RECIPE_SCOPE_REMOVED: "Recipe scope removed"
};
