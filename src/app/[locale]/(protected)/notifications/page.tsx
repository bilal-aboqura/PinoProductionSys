import Link from "next/link";
import type { NotificationCategory } from "@prisma/client";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Pagination } from "@/components/shared/Pagination";
import { getNotificationHistory } from "@/features/notifications/queries";
import { getServerSession } from "@/lib/auth";
import { parsePage } from "@/lib/pagination";
import { NotificationHistoryClient } from "./NotificationHistoryClient";

const categories = ["PRODUCTION", "INVENTORY", "BATCH", "WAREHOUSE", "SYSTEM"] as const;

export default async function NotificationsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  try {
    const session = await getServerSession();
    const category = categories.includes(query.category as NotificationCategory) ? (query.category as NotificationCategory) : undefined;
    const status = query.status === "read" || query.status === "unread" ? query.status : "all";
    const history = await getNotificationHistory(session.user.id, { category, status, page: parsePage(query.page) });

    return (
      <section className="logical-container py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">Role-based alert history, read tracking, and archive controls.</p>
          </div>
          <Link className="rounded-md border bg-white px-3 py-2 text-sm font-semibold text-secondary hover:bg-accent/35" href={`/${locale}/profile/notifications`}>
            Preferences
          </Link>
        </div>

        <form className="mt-6 flex flex-wrap items-end gap-3 rounded-md border bg-white p-4">
          <label className="grid gap-1 text-sm font-semibold text-secondary">
            Category
            <select name="category" defaultValue={category ?? ""} className="h-10 rounded-md border px-3 text-sm">
              <option value="">All</option>
              {categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-secondary">
            Status
            <select name="status" defaultValue={status} className="h-10 rounded-md border px-3 text-sm">
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </label>
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-bold text-white" type="submit">Apply</button>
        </form>

        <div className="mt-6">
          <NotificationHistoryClient locale={locale} notifications={history.rows} />
        </div>
        <div className="mt-4">
          <Pagination
            pathname={`/${locale}/notifications`}
            page={history.page}
            totalPages={history.totalPages}
            totalItems={history.totalCount}
            searchParams={query}
            itemLabel="notifications"
          />
        </div>
      </section>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return <AccessDenied locale={locale} />;
    throw error;
  }
}
