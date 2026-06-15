"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAuditEvent } from "@/features/audit/lib/logger";
import { getServerSession } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/server/db";
import { getUserById, toUserSummary } from "./queries";
import type {
  AssignRoleResult,
  CreateUserInput,
  CreateUserResult,
  ResetPasswordResult,
  ToggleStatusResult,
  UpdateUserInput,
  UpdateUserResult
} from "./types";

const usernameSchema = z.string().min(3).max(30).regex(/^[a-zA-Z0-9._]+$/);
const createSchema = z.object({
  displayName: z.string().min(2).max(100),
  username: usernameSchema,
  email: z.string().email().optional().or(z.literal("")),
  roleId: z.string().min(1),
  departmentIds: z.array(z.string()).optional(),
  recipeCategoryIds: z.array(z.string()).optional(),
  productionLineIds: z.array(z.string()).optional(),
  inventoryAreaIds: z.array(z.string()).optional()
});
const updateSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  email: z.string().email().nullable().optional().or(z.literal(""))
});

function temporaryPassword() {
  return randomBytes(12).toString("base64url").slice(0, 12);
}

async function isLastActiveAdmin(userId: string) {
  const admins = await db.user.count({
    where: {
      isActive: true,
      userRoles: { some: { role: { name: "administrator" } } },
      NOT: { id: userId }
    }
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { userRoles: { include: { role: true } } }
  });

  return Boolean(user?.isActive && user.userRoles.some((userRole) => userRole.role.name === "administrator") && admins === 0);
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const session = await getServerSession();
  requirePermission(session, "users:create");

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "VALIDATION_ERROR", details: parsed.error.issues.map((issue) => issue.message) };
  }

  const username = parsed.data.username.toLowerCase();
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  const existingUsername = await db.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (existingUsername) {
    return { success: false, error: "USERNAME_TAKEN" };
  }

  if (email) {
    const existingEmail = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existingEmail) {
      return { success: false, error: "EMAIL_TAKEN" };
    }
  }

  const password = temporaryPassword();
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        displayName: parsed.data.displayName,
        username,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        userRoles: {
          create: {
            roleId: parsed.data.roleId,
            assignedBy: session.user.id
          }
        },
        departments: { createMany: { data: (parsed.data.departmentIds ?? []).map((departmentId) => ({ departmentId })) } },
        recipeCategories: {
          createMany: { data: (parsed.data.recipeCategoryIds ?? []).map((recipeCategoryId) => ({ recipeCategoryId })) }
        },
        productionLines: {
          createMany: { data: (parsed.data.productionLineIds ?? []).map((productionLineId) => ({ productionLineId })) }
        },
        userWarehouses: {
          createMany: { data: (parsed.data.inventoryAreaIds ?? []).map((warehouseId) => ({ warehouseId })) }
        }
      }
    });

    return created;
  });

  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: user.id,
    targetName: user.displayName,
    action: "USER_CREATED",
    newValue: { id: user.id, username: user.username, email: user.email, displayName: user.displayName }
  });

  const fullUser = await getUserById(user.id);
  revalidatePath("/[locale]/admin/users", "page");
  return { success: true, user: toUserSummary(fullUser!), temporaryPassword: password };
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UpdateUserResult> {
  const session = await getServerSession();
  requirePermission(session, "users:edit");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "VALIDATION_ERROR", details: parsed.error.issues.map((issue) => issue.message) };
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  const email = parsed.data.email === "" ? null : parsed.data.email?.toLowerCase();
  if (email && email !== existing.email) {
    const emailOwner = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, NOT: { id } } });
    if (emailOwner) {
      return { success: false, error: "EMAIL_TAKEN" };
    }
  }

  const user = await db.user.update({
    where: { id },
    data: {
      displayName: parsed.data.displayName ?? existing.displayName,
      email
    }
  });

  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: user.id,
    targetName: user.displayName,
    action: "USER_UPDATED",
    previousValue: { displayName: existing.displayName, email: existing.email },
    newValue: { displayName: user.displayName, email: user.email }
  });

  const fullUser = await getUserById(user.id);
  revalidatePath("/[locale]/admin/users", "page");
  return { success: true, user: toUserSummary(fullUser!) };
}

export async function toggleUserStatus(id: string): Promise<ToggleStatusResult> {
  const session = await getServerSession();
  requirePermission(session, "users:toggle_status");

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  if (existing.isActive && (await isLastActiveAdmin(id))) {
    return { success: false, error: "LAST_ADMIN_PROTECTION" };
  }

  const user = await db.user.update({ where: { id }, data: { isActive: !existing.isActive } });
  if (!user.isActive) {
    await db.session.deleteMany({ where: { userId: user.id } });
  }

  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: user.id,
    targetName: user.displayName,
    action: user.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    previousValue: { isActive: existing.isActive },
    newValue: { isActive: user.isActive }
  });

  const fullUser = await getUserById(user.id);
  revalidatePath("/[locale]/admin/users", "page");
  return { success: true, user: toUserSummary(fullUser!), newStatus: user.isActive ? "active" : "inactive" };
}

export async function resetUserPassword(id: string): Promise<ResetPasswordResult> {
  const session = await getServerSession();
  requirePermission(session, "users:edit");

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  const password = temporaryPassword();
  await db.user.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
      sessions: { deleteMany: {} }
    }
  });

  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: existing.id,
    targetName: existing.displayName,
    action: "PASSWORD_RESET"
  });

  return { success: true, temporaryPassword: password };
}

export async function assignUserRole(userId: string, roleId: string): Promise<AssignRoleResult> {
  const session = await getServerSession();
  requirePermission(session, "roles:manage");

  const [user, role] = await Promise.all([db.user.findUnique({ where: { id: userId } }), db.role.findUnique({ where: { id: roleId } })]);
  if (!user) {
    return { success: false, error: "NOT_FOUND" };
  }
  if (!role) {
    return { success: false, error: "ROLE_NOT_FOUND" };
  }
  if (role.name !== "administrator" && (await isLastActiveAdmin(userId))) {
    return { success: false, error: "LAST_ADMIN_PROTECTION" };
  }

  const previousRoles = await db.userRole.findMany({ where: { userId }, include: { role: true } });
  await db.$transaction([
    db.userRole.deleteMany({ where: { userId } }),
    db.userRole.create({ data: { userId, roleId, assignedBy: session.user.id } }),
    db.session.deleteMany({ where: { userId } })
  ]);

  for (const previous of previousRoles) {
    await logAuditEvent({
      actorId: session.user.id,
      actorName: session.user.displayName,
      targetId: user.id,
      targetName: user.displayName,
      action: "ROLE_REMOVED",
      previousValue: { role: previous.role.name }
    });
  }

  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: user.id,
    targetName: user.displayName,
    action: "ROLE_ASSIGNED",
    newValue: { role: role.name }
  });

  const fullUser = await getUserById(user.id);
  revalidatePath("/[locale]/admin/users", "page");
  return { success: true, user: toUserSummary(fullUser!) };
}
