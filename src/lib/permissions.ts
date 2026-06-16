import type { Session } from "next-auth";
import type { PermissionCode } from "@/features/permissions/types";
import { resolvePermissions } from "@/features/permissions/lib/resolver";

export const CREATE_RECIPES = "recipes:create" as const;
export const EDIT_RECIPES = "recipes:edit" as const;
export const PUBLISH_RECIPES = "recipes:publish" as const;
export const ARCHIVE_RECIPES = "recipes:archive" as const;
export const VIEW_RECIPES = "recipes:view" as const;
export const VIEW_VERSION_HISTORY = "recipes:view_versions" as const;
export const MANAGE_RECIPE_CATEGORIES = "recipes:manage_categories" as const;
export const MANAGE_RECIPE_SCOPE = "recipes:manage_scope" as const;
export const VIEW_SETTINGS = "settings:view" as const;
export const CONFIGURE_SYSTEM = "system:configure" as const;
export const VIEW_PRINTING = "printing:view" as const;
export const CREATE_PRINT_JOB = "printing:create" as const;
export const REPRINT_LABEL = "printing:reprint" as const;
export const MANAGE_PRINTERS = "printing:manage_printers" as const;

export type RecipePermissionKey =
  | typeof CREATE_RECIPES
  | typeof EDIT_RECIPES
  | typeof PUBLISH_RECIPES
  | typeof ARCHIVE_RECIPES
  | typeof VIEW_RECIPES
  | typeof VIEW_VERSION_HISTORY
  | typeof MANAGE_RECIPE_CATEGORIES
  | typeof MANAGE_RECIPE_SCOPE
  | typeof VIEW_SETTINGS
  | typeof CONFIGURE_SYSTEM
  | typeof VIEW_PRINTING
  | typeof CREATE_PRINT_JOB
  | typeof REPRINT_LABEL
  | typeof MANAGE_PRINTERS;

export function requirePermission(session: Session, permission: PermissionCode) {
  if (!session.user.permissions.includes(permission)) {
    throw new Error("PERMISSION_DENIED");
  }
}

export async function hasPermission(userId: string, permissionKey: PermissionCode | RecipePermissionKey) {
  const permissions = await resolvePermissions(userId);
  return permissions.includes(permissionKey as PermissionCode);
}
