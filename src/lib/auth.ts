import { auth } from "@/features/auth/lib/auth.config";

export async function getServerSession() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isActive) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}
