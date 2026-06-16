import { NextResponse } from "next/server";
import { pruneOldNotifications } from "@/features/notifications/engine";

export async function POST(request: Request) {
  const configuredToken = process.env.NOTIFICATION_CLEANUP_TOKEN;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (!configuredToken || token !== configuredToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pruneOldNotifications(90);
  return NextResponse.json({ success: true, purgedCount: result.count });
}
