import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getRecentNotifications } from "@/features/notifications/queries";

export async function GET() {
  try {
    const session = await getServerSession();
    const notifications = await getRecentNotifications(session.user.id, 5);
    return NextResponse.json({ notifications });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Unable to load recent notifications" }, { status: 500 });
  }
}
