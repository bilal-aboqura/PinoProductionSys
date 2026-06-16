import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/features/notifications/queries";

export async function GET() {
  try {
    const session = await getServerSession();
    const count = await getUnreadNotificationCount(session.user.id);
    return NextResponse.json({ count });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load unread notifications" }, { status: 500 });
  }
}
