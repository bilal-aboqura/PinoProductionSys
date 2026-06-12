import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import { resolvePermissions } from "@/features/permissions/lib/resolver";

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
          }
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

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          username: user.username,
          displayName: user.displayName,
          mustChangePassword: user.mustChangePassword,
          isActive: user.isActive,
          languagePreference: user.languagePreference
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          include: {
            userRoles: {
              include: {
                role: true
              },
              take: 1
            }
          }
        });

        if (dbUser) {
          const role = dbUser.userRoles[0]?.role ?? null;
          session.user.id = dbUser.id;
          session.user.username = dbUser.username;
          session.user.displayName = dbUser.displayName;
          session.user.role = role?.name ?? null;
          session.user.roleDisplayName = role?.displayName ?? null;
          session.user.permissions = await resolvePermissions(dbUser.id);
          session.user.mustChangePassword = dbUser.mustChangePassword;
          session.user.isActive = dbUser.isActive;
          session.user.languagePreference = dbUser.languagePreference;
        }
      }

      return session;
    }
  }
});
