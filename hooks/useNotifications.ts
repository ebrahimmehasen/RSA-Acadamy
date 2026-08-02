"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface NotificationRow {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications(profileId: number) {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, message, is_read, created_at")
      // explicit filter (not just RLS): admins have a broader RLS grant
      // on this table for future audit tooling, which would otherwise
      // leak every user's notifications into the admin's own bell
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data ?? []);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    refresh();

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new as NotificationRow,
            ...prev,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, refresh]);

  async function markRead(id: number) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("profile_id", profileId);
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("profile_id", profileId)
      .eq("is_read", false);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, loading, unreadCount, markRead, markAllRead };
}
