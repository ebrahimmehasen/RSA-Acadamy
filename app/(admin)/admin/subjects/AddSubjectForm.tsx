"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSubject } from "./actions";

export function AddSubjectForm({
  classes,
}: {
  classes: { id: number; class_name: string }[];
}) {
  return (
    <form action={addSubject} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="class_id">الصف</Label>
        <select
          id="class_id"
          name="class_id"
          required
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="branch">الشعبة</Label>
        <select
          id="branch"
          name="branch"
          required
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="Arabic">عربي</option>
          <option value="Languages">لغات</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject_name">اسم المادة</Label>
        <Input id="subject_name" name="subject_name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject_code">كود المادة (إنجليزي)</Label>
        <Input id="subject_code" name="subject_code" dir="ltr" placeholder="ART" required />
      </div>
      <div className="flex items-end lg:col-span-4">
        <Button type="submit">إضافة المادة</Button>
      </div>
    </form>
  );
}
