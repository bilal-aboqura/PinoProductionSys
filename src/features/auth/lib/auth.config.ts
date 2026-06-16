import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import type { PermissionCode } from "@/features/permissions/types";

async function loadSessionClaims(userId: string) {
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      mustChangePassword: true,
      isActive: true,
      languagePreference: true,
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

  if (!dbUser) return null;

  const primaryRole = dbUser.userRoles[0]?.role ?? null;
  const permissions = Array.from(
    new Set(
      dbUser.userRoles.flatMap((userRole) =>
        userRole.role.rolePermissions.map((rolePermission) => rolePermission.permission.code as PermissionCode)
      )
    )
  );

  return {
    id: dbUser.id,
    email: dbUser.email,
    username: dbUser.username,
    displayName: dbUser.displayName,
    role: primaryRole?.name ?? null,
    roleDisplayName: primaryRole?.displayName ?? null,
    permissions,
    mustChangePassword: dbUser.mustChangePassword,
    isActive: dbUser.isActive,
    languagePreference: dbUser.languagePreference
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.SESSION_MAX_AGE ?? 28800)
  },
  pages: {
    signIn: "/ar/login"
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!identifier || !password) {
          return null;
        }

        const user = await db.user.findFirst({
          where: {
            OR: [{ username: { equals: identifier, mode: "insensitive" } }, { email: { equals: identifier, mode: "insensitive" } }]
          },
          select: { id: true, passwordHash: true, isActive: true }
        });

        if (!user || !user.isActive) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        const claims = await loadSessionClaims(user.id);
        if (!claims) return null;

        return {
          id: claims.id,
          email: claims.email,
          name: claims.displayName,
          username: claims.username,
          displayName: claims.displayName,
          role: claims.role,
          roleDisplayName: claims.roleDisplayName,
          permissions: claims.permissions,
          mustChangePassword: claims.mustChangePassword,
          isActive: claims.isActive,
          languagePreference: claims.languagePreference
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      if (token.sub) {
        const claims = await loadSessionClaims(token.sub);
        if (claims) {
          token.username = claims.username;
          token.displayName = claims.displayName;
          token.role = claims.role;
          token.roleDisplayName = claims.roleDisplayName;
          token.permissions = claims.permissions;
          token.mustChangePassword = claims.mustChangePassword;
          token.isActive = claims.isActive;
          token.languagePreference = claims.languagePreference;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        const permissions = Array.isArray(token.permissions) ? (token.permissions as PermissionCode[]) : [];
        session.user.id = token.sub;
        session.user.username = typeof token.username === "string" ? token.username : "";
        session.user.displayName =
          typeof token.displayName === "string" ? token.displayName : typeof session.user.name === "string" ? session.user.name : "";
        session.user.role = typeof token.role === "string" ? token.role : null;
        session.user.roleDisplayName = typeof token.roleDisplayName === "string" ? token.roleDisplayName : null;
        session.user.permissions = permissions;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.isActive = token.isActive !== false;
        session.user.languagePreference = typeof token.languagePreference === "string" ? token.languagePreference : "ar";
      }

      return session;
    }
  }
});
