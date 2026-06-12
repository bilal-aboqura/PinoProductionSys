import type { DefaultSession } from "next-auth";
import type { PermissionCode } from "@/features/permissions/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName: string;
      role: string | null;
      roleDisplayName: string | null;
      permissions: PermissionCode[];
      mustChangePassword: boolean;
      isActive: boolean;
      languagePreference: string;
    } & DefaultSession["user"];
  }

  interface User {
    username?: string;
    displayName?: string;
    mustChangePassword?: boolean;
    isActive?: boolean;
    languagePreference?: string;
  }
}
