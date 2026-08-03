"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AnnouncementCard({
  id,
  title,
  content,
  publishedAt,
  attachmentIds,
}: {
  id: number;
  title: string;
  content: string;
  publishedAt: string;
  attachmentIds: string[];
}) {
  useEffect(() => {
    // supabase-js query/rpc builders are thenable but lazy — calling
    // .rpc() without awaiting or chaining .then() never actually sends
    // the request, so the read was silently never recorded.
    const supabase = createClient();
    void supabase.rpc("mark_announcement_read", { p_announcement_id: id }).then();
  }, [id]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="whitespace-pre-wrap">{content}</p>
        {attachmentIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachmentIds.map((driveId, i) => (
              <a
                key={driveId}
                href={`/api/files/${driveId}`}
                target="_blank"
                className="text-primary underline underline-offset-4"
              >
                مرفق {i + 1} 📎
              </a>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground" dir="ltr">
          {new Date(publishedAt).toLocaleString("ar-EG")}
        </p>
      </CardContent>
    </Card>
  );
}
