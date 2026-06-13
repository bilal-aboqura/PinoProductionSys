import { db } from "@/server/db";
import type { ScopeDimension } from "@/features/scopes/types";

const dimensionConfig = {
  departments: { model: "userDepartment", field: "departmentId" },
  recipeCategories: { model: "userRecipeCategory", field: "recipeCategoryId" },
  productionLines: { model: "userProductionLine", field: "productionLineId" },
  inventoryAreas: { model: "userWarehouse", field: "warehouseId" }
} as const;

/**
 * Builds a Prisma WHERE fragment for scoped data queries.
 *
 * Example:
 * const scopeWhere = await buildScopeWhereClause(userId, "departments");
 * await db.productionOrder.findMany({ where: { ...scopeWhere } });
 *
 * An empty object means the user has no assignments for that dimension and is unrestricted.
 */
export async function buildScopeWhereClause(userId: string, dimension: ScopeDimension) {
  const config = dimensionConfig[dimension];
  const delegate = db[config.model] as unknown as {
    findMany(args: { where: { userId: string }; select: Record<string, true> }): Promise<Record<string, string>[]>;
  };
  const assignments = await delegate.findMany({
    where: { userId },
    select: { [config.field]: true }
  });

  const ids = assignments.map((assignment) => assignment[config.field]);
  if (ids.length === 0) {
    return {};
  }

  return { [config.field]: { in: ids } };
}
