"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { archiveNotification, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import type { NotificationDTO } from "@/features/notifications/types";
import { notificationAgeLabel, resolveNotificationHref } from "@/features/notifications/utils";
import { NotificationToast } from "./NotificationToast";

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("Request failed");
  return response.json() as Promise<T>;
};

export function NotificationBell({ locale }: { locale: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const unread = useSWR<{ count: number }>("/api/notifications/unread", fetcher, { refreshInterval: 10000, revalidateOnFocus: true });
  const recent = useSWR<{ notifications: NotificationDTO[] }>("/api/notifications/recent", fetcher, { refreshInterval: 10000, revalidateOnFocus: true });
  const notifications = recent.data?.notifications ?? [];
  const count = unread.data?.count ?? 0;

  function refresh() {
    void unread.mutate();
    void recent.mutate();
  }

  function openNotification(notification: NotificationDTO) {
    startTransition(async () => {
      await markNotificationRead(notification.id);
      refresh();
      setOpen(false);
      router.push(resolveNotificationHref(locale, notification.relatedEntityType, notification.relatedEntityId));
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,360px)] rounded-md border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <p className="text-sm font-bold">Notifications</p>
              <p className="text-xs text-muted">{count} unread</p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
              aria-label="Mark all notifications read"
              onClick={() =>
                startTransition(async () => {
                  await markAllNotificationsRead();
                  refresh();
                })
              }
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto py-1">
            {notifications.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-8 text-sm text-muted">
                <Inbox className="h-4 w-4" />
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className="group flex items-start gap-2 px-3 py-2 hover:bg-accent/25">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openNotification(notification)}>
                    <div className="flex items-center gap-2">
                      <span className={notification.isRead ? "text-sm font-semibold text-secondary" : "text-sm font-bold text-primary"}>
                        {notification.title}
                      </span>
                      <span className="rounded-full bg-accent/50 px-2 py-0.5 text-[11px] font-semibold text-secondary">{notification.category}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-muted">{notificationAgeLabel(notification.createdAt)}</p>
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary opacity-70 hover:bg-white"
                    aria-label="Archive notification"
                    onClick={() =>
                      startTransition(async () => {
                        await archiveNotification(notification.id);
                        refresh();
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <button
            type="button"
            className="block w-full border-t px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-accent/30"
            onClick={() => {
              setOpen(false);
              router.push(`/${locale}/notifications`);
            }}
          >
            View history
          </button>
        </div>
      ) : null}

      <NotificationToast notifications={notifications} />
    </div>
  );
}
