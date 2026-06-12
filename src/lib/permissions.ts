import type { Session } from "next-auth";
import type { PermissionCode } from "@/features/permissions/types";

export function requirePermission(session: Session, permission: PermissionCode) {
  if (!session.user.permissions.includes(permission)) {
    throw new Error("PERMISSION_DENIED");
  }
}
