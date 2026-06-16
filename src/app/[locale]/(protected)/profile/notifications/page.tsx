import Link from "next/link";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { getServerSession } from "@/lib/auth";
import { updateNotificationPreferencesFromForm } from "@/features/notifications/actions";
import { getNotificationPreferences } from "@/features/notifications/queries";

const preferenceRows = [
  ["inventoryAlerts", "Inventory and warehouse alerts", "Low stock, negative inventory, and warehouse movement issues."],
  ["batchAlerts", "Batch alerts", "Near-expiry and expired batch notifications."],
  ["productionAlerts", "Production alerts", "Delayed production orders and production workflow exceptions."],
  ["systemAlerts", "System alerts", "Administrative and platform-level operational notices."]
] as const;

export default async function NotificationPreferencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  try {
    const session = await getServerSession();
    const preferences = await getNotificationPreferences(session.user.id);

    return (
      <section className="logical-container py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Notification Preferences</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted">Choose which categories can generate in-app alerts for your account.</p>
          </div>
          <Link className="rounded-md border bg-white px-3 py-2 text-sm font-semibold text-secondary hover:bg-accent/35" href={`/${locale}/notifications`}>
            History
          </Link>
        </div>

        <form action={updateNotificationPreferencesFromForm} className="mt-6 rounded-md border bg-white p-4">
          <div className="divide-y">
            {preferenceRows.map(([key, title, detail]) => (
              <label key={key} className="flex items-start justify-between gap-4 py-4">
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="mt-1 block text-sm text-muted">{detail}</span>
                </span>
                <input name={key} type="checkbox" defaultChecked={preferences[key]} className="mt-1 h-5 w-5" />
              </label>
            ))}
          </div>
          <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white" type="submit">
            Save preferences
          </button>
        </form>
      </section>
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return <AccessDenied locale={locale} />;
    throw error;
  }
}
