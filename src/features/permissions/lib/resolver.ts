import { db } from "@/server/db";
import type { PermissionCode } from "@/features/permissions/types";

export async function resolvePermissions(userId: string): Promise<PermissionCode[]> {
  const roles = await db.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });

  return Array.from(
    new Set(
      roles.flatMap((userRole) =>
        userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code as PermissionCode)
      )
    )
  );
}
