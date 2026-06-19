import { getServerSession } from "@/lib/auth";
import { db } from "@/server/db";
import type { PermissionCode } from "@/features/permissions/types";

/** Resolves permissions from current database role assignments to prevent stale-session authorization. */
export async function resolvePermissions(userId?: string): Promise<PermissionCode[]> {
  const resolvedUserId = userId ?? (await getServerSession()).user.id;
  const assignments = await db.userRole.findMany({
    where: { userId: resolvedUserId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
  });
  return Array.from(
    new Set(assignments.flatMap((assignment) => assignment.role.rolePermissions.map((entry) => entry.permission.code as PermissionCode)))
  );
}
