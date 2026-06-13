import { db } from "@/server/db";

const unrestrictedPermissions = new Set(["inventory:manage", "inventory:approve"]);

export async function assertUserWarehouseAccess(userId: string, warehouseId: string) {
  const rolePermissions = await db.userRole.findMany({
    where: { userId },
    include: { role: { include: { rolePermissions: { include: { permission: true } } } } }
  });
  const permissions = new Set(rolePermissions.flatMap((userRole) => userRole.role.rolePermissions.map((item) => item.permission.code)));
  if ([...unrestrictedPermissions].some((permission) => permissions.has(permission))) return;

  const assignment = await db.userWarehouse.findUnique({ where: { userId_warehouseId: { userId, warehouseId } } });
  if (!assignment) throw new Error("WAREHOUSE_SCOPE_DENIED");
}
