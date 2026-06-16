"use client";

import { useTransition } from "react";
import { Archive, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { archiveNotification, markNotificationRead } from "@/features/notifications/actions";
import type { NotificationDTO } from "@/features/notifications/types";
import { notificationAgeLabel, resolveNotificationHref } from "@/features/notifications/utils";

export function NotificationHistoryClient({ locale, notifications }: { locale: string; notifications: NotificationDTO[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function openNotification(notification: NotificationDTO) {
    startTransition(async () => {
      await markNotificationRead(notification.id);
      router.refresh();
      router.push(resolveNotificationHref(locale, notification.relatedEntityType, notification.relatedEntityId));
    });
  }

  if (notifications.length === 0) {
    return <div className="rounded-md border bg-white p-8 text-sm text-muted">No notifications match the current filters.</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-accent/35 text-left text-xs uppercase text-secondary">
          <tr>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Alert</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {notifications.map((notification) => (
            <tr key={notification.id} className={notification.isRead ? "bg-white" : "bg-primary/5"}>
              <td className="px-3 py-3">{notification.isRead ? "Read" : "Unread"}</td>
              <td className="max-w-md px-3 py-3">
                <button type="button" className="text-left" onClick={() => openNotification(notification)}>
                  <p className={notification.isRead ? "font-semibold text-secondary" : "font-bold text-primary"}>{notification.title}</p>
                  <p className="mt-1 text-muted">{notification.message}</p>
                </button>
              </td>
              <td className="px-3 py-3">{notification.category}</td>
              <td className="px-3 py-3">{notification.severity}</td>
              <td className="px-3 py-3">{notificationAgeLabel(notification.createdAt)}</td>
              <td className="px-3 py-3">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
                    aria-label="Open related record"
                    onClick={() => openNotification(notification)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
                    aria-label="Mark notification read"
                    onClick={() =>
                      startTransition(async () => {
                        await markNotificationRead(notification.id);
                        router.refresh();
                      })
                    }
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
                    aria-label="Archive notification"
                    onClick={() =>
                      startTransition(async () => {
                        await archiveNotification(notification.id);
                        router.refresh();
                      })
                    }
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
