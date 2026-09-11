"use client";

import { useState, useTransition } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateSlotZoom, type UpdateZoomResult } from "./actions";

export function TeacherZoomForm({
  slotId,
  zoomLink,
  zoomMeetingId,
  zoomPasscode,
}: {
  slotId: number;
  zoomLink: string | null;
  zoomMeetingId: string | null;
  zoomPasscode: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UpdateZoomResult | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="xs" className="gap-1">
            <Video className="size-3.5" aria-hidden="true" />
            {zoomLink ? "تعديل الرابط" : "إضافة رابط"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>رابط Zoom للحصة</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) =>
            startTransition(async () => {
              const res = await updateSlotZoom(null, formData);
              setResult(res);
              if (res.ok) setOpen(false);
            })
          }
          className="space-y-3"
        >
          <input type="hidden" name="slot_id" value={slotId} />
          <div className="space-y-2">
            <Label htmlFor={`zoom_link-${slotId}`}>رابط الاجتماع</Label>
            <Input
              id={`zoom_link-${slotId}`}
              name="zoom_link"
              type="url"
              dir="ltr"
              placeholder="https://zoom.us/j/..."
              defaultValue={zoomLink ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`zoom_meeting_id-${slotId}`}>رقم الاجتماع</Label>
              <Input
                id={`zoom_meeting_id-${slotId}`}
                name="zoom_meeting_id"
                dir="ltr"
                defaultValue={zoomMeetingId ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`zoom_passcode-${slotId}`}>كلمة السر</Label>
              <Input
                id={`zoom_passcode-${slotId}`}
                name="zoom_passcode"
                dir="ltr"
                defaultValue={zoomPasscode ?? ""}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            سيظهر رابط الدخول لطلابك قبل موعد الحصة بربع ساعة فقط
          </p>
          {result && (
            <p
              className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
              aria-live="polite"
            >
              {result.message}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              إلغاء
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الحفظ…" : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
