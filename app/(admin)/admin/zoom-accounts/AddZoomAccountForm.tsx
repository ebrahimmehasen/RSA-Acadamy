"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addZoomAccount } from "./actions";

export function AddZoomAccountForm() {
  return (
    <form action={addZoomAccount} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="label">اسم الحساب</Label>
        <Input id="label" name="label" placeholder="الحساب الثاني" required />
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="link">رابط الاجتماع</Label>
        <Input
          id="link"
          name="link"
          type="url"
          dir="ltr"
          placeholder="https://zoom.us/j/..."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="meeting_id">Meeting ID (اختياري)</Label>
        <Input id="meeting_id" name="meeting_id" dir="ltr" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passcode">Passcode (اختياري)</Label>
        <Input id="passcode" name="passcode" dir="ltr" />
      </div>
      <div className="flex items-end">
        <Button type="submit">إضافة الحساب</Button>
      </div>
    </form>
  );
}
