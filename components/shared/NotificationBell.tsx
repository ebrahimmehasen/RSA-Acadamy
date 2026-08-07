"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";

const TYPE_ICON: Record<string, string> = {
  assignment: "📝",
  grade: "📊",
  schedule: "📅",
  quiz: "🧪",
  session: "🎬",
  announcement: "📢",
};

export function NotificationBell({ profileId }: { profileId: number }) {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications(profileId);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
      >
        🔔
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -left-1 h-5 min-w-5 justify-center px-1 text-xs">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-80 rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <span className="font-medium">الإشعارات</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary underline underline-offset-4"
              >
                تعليم الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                مفيش إشعارات
              </p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`block w-full border-b p-3 text-right text-sm last:border-b-0 hover:bg-accent ${
                  n.is_read ? "" : "bg-primary/5 font-medium"
                }`}
              >
                <p>
                  {TYPE_ICON[n.type] ?? "🔔"} {n.title}
                </p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {new Date(n.created_at).toLocaleString("ar-EG")}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
