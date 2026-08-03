"use client";

import { useRef } from "react";
import { recordView } from "./actions";

export function VideoTracker({
  sessionId,
  driveId,
}: {
  sessionId: number;
  driveId: string;
}) {
  const reportedRef = useRef(0);

  function report(percentage: number) {
    if (percentage - reportedRef.current < 5) return; // throttle
    reportedRef.current = percentage;
    const formData = new FormData();
    formData.set("session_id", String(sessionId));
    formData.set("watch_percentage", String(Math.round(percentage)));
    recordView(formData);
  }

  return (
    <video
      src={`/api/files/${driveId}`}
      controls
      className="w-full rounded-lg border"
      onTimeUpdate={(e) => {
        const video = e.currentTarget;
        if (!video.duration) return;
        report((video.currentTime / video.duration) * 100);
      }}
      onEnded={() => report(100)}
    />
  );
}
