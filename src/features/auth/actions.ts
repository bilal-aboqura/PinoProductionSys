"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/features/auth/lib/auth.config";
import { logAuditEvent } from "@/features/audit/lib/logger";
import { getServerSession } from "@/lib/auth";
import { db } from "@/server/db";
import type { ChangePasswordInput, ChangePasswordResult, LoginInput, LoginResult } from "./types";

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/)
  .regex(/[0-9]/);

export async function login(credentials: LoginInput): Promise<LoginResult> {
  const identifier = credentials.identifier.trim().toLowerCase();
  const user = await db.user.findFirst({
    where: {
      OR: [{ username: { equals: identifier, mode: "insensitive" } }, { email: { equals: identifier, mode: "insensitive" } }]
    }
  });

  if (!user) {
    return { success: false, error: "INVALID_CREDENTIALS" };
  }

  if (!user.isActive) {
    return { success: false, error: "ACCOUNT_INACTIVE" };
  }

  try {
    await signIn("credentials", {
      identifier,
      password: credentials.password,
      redirect: false
    });

    await logAuditEvent({
      actorId: user.id,
      actorName: user.displayName,
      targetId: user.id,
      targetName: user.displayName,
      action: "LOGIN_SUCCESS"
    });

    return { success: true, redirectTo: user.mustChangePassword ? "/change-password" : "/dashboard" };
  } catch (error) {
    if (error instanceof AuthError) {
      await logAuditEvent({
        actorId: user.id,
        actorName: user.displayName,
        targetId: user.id,
        targetName: user.displayName,
        action: "LOGIN_FAILED"
      });
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    throw error;
  }
}

export async function logout(locale = "ar") {
  const session = await getServerSession();
  await logAuditEvent({
    actorId: session.user.id,
    actorName: session.user.displayName,
    targetId: session.user.id,
    targetName: session.user.displayName,
    action: "LOGOUT"
  });

  await signOut({ redirect: false });
  redirect(`/${locale}/login`);
}

export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  const session = await getServerSession();
  const parsed = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: passwordSchema,
      confirmPassword: z.string()
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "PASSWORD_MISMATCH"
    })
    .safeParse(input);

  if (!parsed.success) {
    return { success: false, error: "VALIDATION_ERROR", details: parsed.error.issues.map((issue) => issue.message) };
  }

  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);

  if (!valid) {
    return { success: false, error: "WRONG_CURRENT_PASSWORD" };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 12),
      mustChangePassword: false
    }
  });

  await logAuditEvent({
    actorId: user.id,
    actorName: user.displayName,
    targetId: user.id,
    targetName: user.displayName,
    action: "PASSWORD_CHANGED"
  });

  return { success: true };
}

export async function updateLanguagePreference(locale: "ar" | "en") {
  const session = await getServerSession();
  await db.user.update({
    where: { id: session.user.id },
    data: { languagePreference: locale }
  });
}
