"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rateSession } from "./actions";

export function RatingForm({
  sessionId,
  currentRating,
  currentReview,
}: {
  sessionId: number;
  currentRating: number | null;
  currentReview: string | null;
}) {
  const [rating, setRating] = useState(currentRating ?? 0);

  return (
    <form action={rateSession} className="space-y-3">
      <input type="hidden" name="session_id" value={sessionId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={star <= rating ? "text-yellow-500" : "text-muted-foreground"}
          >
            ★
          </button>
        ))}
      </div>
      <Textarea
        name="review"
        placeholder="رأيك في الحصة (اختياري)"
        defaultValue={currentReview ?? ""}
        rows={2}
      />
      <Button type="submit" size="sm" disabled={rating === 0}>
        {currentRating ? "تحديث التقييم" : "إرسال التقييم"}
      </Button>
    </form>
  );
}
