"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAnnouncement } from "./actions";

export function AnnouncementForm({
  classes,
}: {
  classes: { id: number; class_name: string }[];
}) {
  const [targetType, setTargetType] = useState("all");

  return (
    <form action={createAnnouncement} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title_ar">العنوان (عربي)</Label>
          <Input id="title_ar" name="title_ar" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title_en">العنوان (إنجليزي، اختياري)</Label>
          <Input id="title_en" name="title_en" dir="ltr" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="content_ar">المحتوى (عربي)</Label>
          <Textarea id="content_ar" name="content_ar" rows={4} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content_en">المحتوى (إنجليزي، اختياري)</Label>
          <Textarea id="content_en" name="content_en" rows={4} dir="ltr" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target_type">الفئة المستهدفة</Label>
        <select
          id="target_type"
          name="target_type"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-64"
        >
          <option value="all">الجميع</option>
          <option value="role">دور محدد</option>
          <option value="class">فصل محدد</option>
          <option value="branch">شعبة محددة</option>
          <option value="student">طالب محدد</option>
        </select>
      </div>

      {targetType === "role" && (
        <div className="space-y-2">
          <Label htmlFor="target_role">الدور</Label>
          <select
            id="target_role"
            name="target_role"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-64"
          >
            <option value="student">الطلاب</option>
            <option value="parent">أولياء الأمور</option>
            <option value="teacher">المدرسون</option>
          </select>
        </div>
      )}

      {targetType === "class" && (
        <div className="space-y-2">
          <Label htmlFor="target_class_id">الفصل</Label>
          <select
            id="target_class_id"
            name="target_class_id"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-64"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {targetType === "branch" && (
        <div className="space-y-2">
          <Label htmlFor="target_branch">الشعبة</Label>
          <select
            id="target_branch"
            name="target_branch"
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm sm:w-64"
          >
            <option value="Arabic">عربي</option>
            <option value="Languages">لغات</option>
          </select>
        </div>
      )}

      {targetType === "student" && (
        <div className="space-y-2">
          <Label htmlFor="target_student_code">كود الطالب</Label>
          <Input
            id="target_student_code"
            name="target_student_code"
            dir="ltr"
            className="sm:w-64"
          />
        </div>
      )}

      <Button type="submit">نشر الإعلان</Button>
    </form>
  );
}
