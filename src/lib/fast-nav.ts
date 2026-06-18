import { cache } from "react";
import { cookies } from "next/headers";
import type { PermissionCode } from "@/features/permissions/types";
import { db } from "@/server/db";

export const FAST_NAV_COOKIE = "pino_nav";

export type FastNavUser = {
  id: string;
  displayName: string;
  role: string | null;
  roleDisplayName: string | null;
  permissions: PermissionCode[];
};

function encodeNavUser(user: FastNavUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

function decodeNavUser(value: string): FastNavUser | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as FastNavUser;
    if (!parsed.id || !parsed.displayName || !Array.isArray(parsed.permissions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export const getFastNavUser = cache(async () => {
  const value = (await cookies()).get(FAST_NAV_COOKIE)?.value;
  return value ? decodeNavUser(value) : null;
});

export async function setFastNavUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      userRoles: {
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
      }
    }
  });

  if (!user) return null;

  const role = user.userRoles[0]?.role ?? null;
  const navUser: FastNavUser = {
    id: user.id,
    displayName: user.displayName,
    role: role?.name ?? null,
    roleDisplayName: role?.displayName ?? null,
    permissions: Array.from(
      new Set(
        user.userRoles.flatMap((userRole) =>
          userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code as PermissionCode)
        )
      )
    )
  };

  (await cookies()).set(FAST_NAV_COOKIE, encodeNavUser(navUser), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Number(process.env.SESSION_MAX_AGE ?? 28800)
  });

  return navUser;
}

export async function clearFastNavUser() {
  (await cookies()).delete(FAST_NAV_COOKIE);
}
