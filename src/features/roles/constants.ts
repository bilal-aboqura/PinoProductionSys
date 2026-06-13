import type { PermissionCode } from "@/features/permissions/types";

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  administrator: [
    "users:view",
    "users:create",
    "users:edit",
    "users:delete",
    "users:toggle_status",
    "roles:manage",
    "audit:view",
    "production:view",
    "production:execute",
    "production:approve",
    "production:reject",
    "inventory:view",
    "inventory:manage",
    "inventory:adjust",
    "inventory:transfer",
    "inventory:approve",
    "reports:view",
    "system:configure"
  ],
  supervisor: [
    "production:view",
    "production:approve",
    "production:reject",
    "inventory:view",
    "inventory:adjust",
    "inventory:transfer",
    "inventory:approve",
    "reports:view"
  ],
  production_staff: ["production:view", "production:execute"],
  warehouse_staff: ["inventory:view", "inventory:manage", "inventory:adjust", "inventory:transfer"]
};
