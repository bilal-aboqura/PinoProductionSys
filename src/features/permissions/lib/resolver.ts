import { getServerSession } from "@/lib/auth";
import type { PermissionCode } from "@/features/permissions/types";

/**
 * Resolves the current user's permissions from the JWT session.
 * Permissions are embedded in the signed token at login — no DB query needed.
 * `getServerSession` is wrapped in React `cache()` so this is free on repeated calls.
 *
 * @param _userId - Accepted for backwards-compatibility but unused; session is authoritative.
 */
export async function resolvePermissions(_userId?: string): Promise<PermissionCode[]> {
  const session = await getServerSession();
  return session.user.permissions;
}
