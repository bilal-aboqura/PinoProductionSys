import { getServerSession } from "@/lib/auth";
import type { PermissionCode } from "@/features/permissions/types";

export async function PermissionGate({
  permission,
  fallback = null,
  children
}: {
  permission: PermissionCode;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession();
    return session.user.permissions.includes(permission) ? <>{children}</> : <>{fallback}</>;
  } catch {
    return <>{fallback}</>;
  }
}
