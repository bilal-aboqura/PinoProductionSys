"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, X } from "lucide-react";
import type { NotificationDTO } from "@/features/notifications/types";

export function NotificationToast({ notifications }: { notifications: NotificationDTO[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = useMemo(
    () => notifications.filter((notification) => !notification.isRead && notification.severity !== "INFO" && !dismissed.has(notification.id)).slice(0, 3),
    [dismissed, notifications]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDismissed((current) => new Set([...current, ...visible.map((notification) => notification.id)]));
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex w-[min(92vw,360px)] flex-col gap-2">
      {visible.map((notification) => {
        const Icon = notification.severity === "CRITICAL" ? AlertTriangle : Info;
        return (
          <div key={notification.id} className="rounded-md border border-accent bg-white p-3 shadow-lg">
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{notification.title}</p>
                <p className="mt-1 text-sm text-muted">{notification.message}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-secondary hover:bg-accent/45"
                aria-label="Dismiss notification"
                onClick={() => setDismissed((current) => new Set(current).add(notification.id))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
