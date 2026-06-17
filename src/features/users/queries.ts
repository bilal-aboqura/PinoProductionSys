import { db } from "@/server/db";
import { paginationInput, totalPages } from "@/lib/pagination";
import type { UserSummary } from "./types";

export const userSummaryInclude = {
  userRoles: { include: { role: true }, take: 1 },
  departments: { include: { department: true } },
  recipeCategories: { include: { recipeCategory: true } },
  productionLines: { include: { productionLine: true } },
  userWarehouses: { include: { warehouse: true } }
} as const;

type UserWithRelations = Awaited<ReturnType<typeof getUserById>>;

export function toUserSummary(user: NonNullable<UserWithRelations>): UserSummary {
  const role = user.userRoles[0]?.role ?? null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    languagePreference: user.languagePreference,
    role: role ? { id: role.id, name: role.name, displayName: role.displayName } : null,
    scopes: {
      departments: user.departments.map(({ department }) => ({ id: department.id, name: department.name })),
      recipeCategories: user.recipeCategories.map(({ recipeCategory }) => ({ id: recipeCategory.id, name: recipeCategory.name })),
      productionLines: user.productionLines.map(({ productionLine }) => ({ id: productionLine.id, name: productionLine.name })),
      inventoryAreas: user.userWarehouses.map(({ warehouse }) => ({ id: warehouse.id, name: warehouse.name }))
    },
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null
  };
}

export async function getUserList(filters?: {
  search?: string;
  roleId?: string;
  status?: "active" | "inactive";
  page?: number;
  pageSize?: number;
  sort?: "displayName" | "createdAt" | "lastLoginAt";
}) {
  const { page, pageSize, skip, take } = paginationInput(filters?.page, filters?.pageSize ?? 20);
  const search = filters?.search?.trim();

  const where = {
    ...(search
      ? {
          OR: [
            { displayName: { contains: search, mode: "insensitive" as const } },
            { username: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {}),
    ...(filters?.status ? { isActive: filters.status === "active" } : {}),
    ...(filters?.roleId ? { userRoles: { some: { roleId: filters.roleId } } } : {})
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        isActive: true,
        mustChangePassword: true,
        languagePreference: true,
        createdAt: true,
        lastLoginAt: true,
        userRoles: {
          select: { role: { select: { id: true, name: true, displayName: true } } },
          take: 1
        }
      },
      orderBy: { [filters?.sort ?? "createdAt"]: "desc" },
      skip,
      take
    }),
    db.user.count({ where })
  ]);

  return {
    users: users.map((user) => {
      const role = user.userRoles[0]?.role ?? null;
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        languagePreference: user.languagePreference,
        role: role ? { id: role.id, name: role.name, displayName: role.displayName } : null,
        scopes: {
          departments: [],
          recipeCategories: [],
          productionLines: [],
          inventoryAreas: []
        },
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null
      };
    }),
    total,
    page,
    pageSize,
    totalPages: totalPages(total, pageSize)
  };
}

export async function getUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    include: userSummaryInclude
  });
}

export async function getRoleOptions() {
  return db.role.findMany({ orderBy: { displayName: "asc" } });
}

export async function getScopeOptions() {
  const [departments, recipeCategories, productionLines, inventoryAreas] = await Promise.all([
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.recipeCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.productionLine.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);

  return { departments, recipeCategories, productionLines, inventoryAreas };
}
