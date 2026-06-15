"use server";

import { z } from "zod";
import { logAuditEvent } from "@/features/audit/lib/logger";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/server/db";
import type { ScopeAssignment, AssignScopesResult } from "./types";

const schema = z.object({
  departmentIds: z.array(z.string()).optional(),
  recipeCategoryIds: z.array(z.string()).optional(),
  productionLineIds: z.array(z.string()).optional(),
  inventoryAreaIds: z.array(z.string()).optional()
});

export async function assignUserScopes(userId: string, scopes: ScopeAssignment): Promise<AssignScopesResult> {
  const session = await getServerSession();
  requirePermission(session, "users:edit");

  const parsed = schema.safeParse(scopes);
  if (!parsed.success) {
    return { success: false, error: "VALIDATION_ERROR" };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "NOT_FOUND" };
  }

  await db.$transaction(async (tx) => {
    if (parsed.data.departmentIds) {
      await tx.userDepartment.deleteMany({ where: { userId } });
      await tx.userDepartment.createMany({
        data: parsed.data.departmentIds.map((departmentId) => ({ userId, departmentId })),
        skipDuplicates: true
      });
    }
    if (parsed.data.recipeCategoryIds) {
      await tx.userRecipeCategory.deleteMany({ where: { userId } });
      await tx.userRecipeCategory.createMany({
        data: parsed.data.recipeCategoryIds.map((recipeCategoryId) => ({ userId, recipeCategoryId })),
        skipDuplicates: true
      });
    }
    if (parsed.data.productionLineIds) {
      await tx.userProductionLine.deleteMany({ where: { userId } });
      await tx.userProductionLine.createMany({
        data: parsed.data.productionLineIds.map((productionLineId) => ({ userId, productionLineId })),
        skipDuplicates: true
      });
    }
    if (parsed.data.inventoryAreaIds) {
      await tx.userWarehouse.deleteMany({ where: { userId } });
      await tx.userWarehouse.createMany({
        data: parsed.data.inventoryAreaIds.map((warehouseId) => ({ userId, warehouseId })),
        skipDuplicates: true
      });
    }
  });

  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: user.id,
    targetName: user.displayName,
    action: "SCOPE_ASSIGNED",
    newValue: parsed.data
  });

  return { success: true };
}
