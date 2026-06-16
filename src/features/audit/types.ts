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
  RECIPE_SCOPE_REMOVED: "Recipe scope removed",
  PRODUCTION_ORDER_CREATED: "Production order created",
  PRODUCTION_ORDER_ASSIGNED: "Production order assigned",
  PRODUCTION_ORDER_CLAIMED: "Production order claimed",
  PRODUCTION_ORDER_STARTED: "Production order started",
  PRODUCTION_ORDER_STEP_COMPLETED: "Production order step completed",
  PRODUCTION_ORDER_PHOTO_UPLOADED: "Production order photo uploaded",
  PRODUCTION_ORDER_NOTE_ADDED: "Production order note added",
  PRODUCTION_ORDER_QUANTITY_CONFIRMED: "Production order quantity confirmed",
  PRODUCTION_ORDER_COMPLETED: "Production order completed",
  PRODUCTION_ORDER_CANCELLED: "Production order cancelled",
  SYSTEM_SETTING_UPDATED: "System setting updated",
  MASTER_DATA_CREATED: "Master data created",
  MASTER_DATA_UPDATED: "Master data updated",
  MASTER_DATA_ARCHIVED: "Master data archived",
  MASTER_DATA_RESTORED: "Master data restored",
  PRINTER_CREATED: "Printer created",
  PRINTER_UPDATED: "Printer updated",
  PRINTER_DEACTIVATED: "Printer deactivated",
  LABEL_PRINTED: "Label printed",
  LABEL_REPRINTED: "Label reprinted",
  PRINT_JOB_FAILED: "Print job failed"
};
