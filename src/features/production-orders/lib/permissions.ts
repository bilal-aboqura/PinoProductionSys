import type { PermissionCode } from "@/features/permissions/types";

export const VIEW_PRODUCTION_ORDERS = "production-orders:view" as const;
export const CREATE_PRODUCTION_ORDERS = "production-orders:create" as const;
export const ASSIGN_PRODUCTION_ORDERS = "production-orders:assign" as const;
export const CLAIM_PRODUCTION_ORDERS = "production-orders:claim" as const;
export const EXECUTE_PRODUCTION_ORDERS = "production-orders:execute" as const;
export const COMPLETE_PRODUCTION_ORDERS = "production-orders:complete" as const;
export const CANCEL_PRODUCTION_ORDERS = "production-orders:cancel" as const;
export const VIEW_ALL_PRODUCTION_ORDERS = "production-orders:view_all" as const;

export type ProductionOrderPermissionKey =
  | typeof VIEW_PRODUCTION_ORDERS
  | typeof CREATE_PRODUCTION_ORDERS
  | typeof ASSIGN_PRODUCTION_ORDERS
  | typeof CLAIM_PRODUCTION_ORDERS
  | typeof EXECUTE_PRODUCTION_ORDERS
  | typeof COMPLETE_PRODUCTION_ORDERS
  | typeof CANCEL_PRODUCTION_ORDERS
  | typeof VIEW_ALL_PRODUCTION_ORDERS;

export const PRODUCTION_ORDER_PERMISSIONS: ProductionOrderPermissionKey[] = [
  VIEW_PRODUCTION_ORDERS,
  CREATE_PRODUCTION_ORDERS,
  ASSIGN_PRODUCTION_ORDERS,
  CLAIM_PRODUCTION_ORDERS,
  EXECUTE_PRODUCTION_ORDERS,
  COMPLETE_PRODUCTION_ORDERS,
  CANCEL_PRODUCTION_ORDERS,
  VIEW_ALL_PRODUCTION_ORDERS
];

const legacyPermissionFallbacks: Partial<Record<ProductionOrderPermissionKey, string[]>> = {
  [VIEW_PRODUCTION_ORDERS]: ["production:view"],
  [VIEW_ALL_PRODUCTION_ORDERS]: ["production:approve", "production:reject"],
  [CREATE_PRODUCTION_ORDERS]: ["production:approve"],
  [ASSIGN_PRODUCTION_ORDERS]: ["production:approve"],
  [CLAIM_PRODUCTION_ORDERS]: ["production:execute"],
  [EXECUTE_PRODUCTION_ORDERS]: ["production:execute"],
  [COMPLETE_PRODUCTION_ORDERS]: ["production:approve", "production:execute"],
  [CANCEL_PRODUCTION_ORDERS]: ["production:reject"]
};

export function hasProductionOrderPermission(permissions: string[] | undefined, permission: ProductionOrderPermissionKey | PermissionCode) {
  if (!permissions) return false;
  if (permissions.includes(permission)) return true;
  const fallbacks = legacyPermissionFallbacks[permission as ProductionOrderPermissionKey] ?? [];
  return fallbacks.some((fallback) => permissions.includes(fallback));
}
