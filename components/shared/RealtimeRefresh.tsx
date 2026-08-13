"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Watch {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  /** Postgres Changes filter, e.g. "student_id=eq.42" */
  filter?: string;
}

/**
 * Invisible listener that soft-refreshes the current server-rendered
 * page (router.refresh — re-fetches the RSC payload, no full reload
 * or lost scroll position) whenever one of the given tables changes.
 * Lets grade/exam updates reach an already-open page without the
 * user hitting F5.
 */
export function RealtimeRefresh({
  channelName,
  watches,
}: {
  channelName: string;
  watches: Watch[];
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(channelName);
    for (const watch of watches) {
      channel = channel.on(
        "postgres_changes",
        {
          event: watch.event ?? "*",
          schema: "public",
          table: watch.table,
          filter: watch.filter,
        },
        () => router.refresh(),
      );
    }
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);

  return null;
}
