import { auth } from "@/features/auth/lib/auth.config";
import { cache } from "react";

export const getServerSession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id || !session.user.isActive) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
});
