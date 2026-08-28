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
          <Label htmlFor="title_ar">ط§ظ„ط¹ظ†ظˆط§ظ† (ط¹ط±ط¨ظٹ)</Label>
          <Input id="title_ar" name="title_ar" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title_en">ط§ظ„ط¹ظ†ظˆط§ظ† (ط¥ظ†ط¬ظ„ظٹط²ظٹطŒ ط§ط®طھظٹط§ط±ظٹ)</Label>
          <Input id="title_en" name="title_en" dir="ltr" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="content_ar">ط§ظ„ظ…ط­طھظˆظ‰ (ط¹ط±ط¨ظٹ)</Label>
          <Textarea id="content_ar" name="content_ar" rows={4} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content_en">ط§ظ„ظ…ط­طھظˆظ‰ (ط¥ظ†ط¬ظ„ظٹط²ظٹطŒ ط§ط®طھظٹط§ط±ظٹ)</Label>
          <Textarea id="content_en" name="content_en" rows={4} dir="ltr" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachments">ظ…ط±ظپظ‚ط§طھ (ط§ط®طھظٹط§ط±ظٹطŒ ط­ط¯ ط£ظ‚طµظ‰ 5 ظ…ظ„ظپط§طھطŒ 100MB ظ„ظƒظ„ ظ…ظ„ظپ)</Label>
        <Input
          id="attachments"
          name="attachments"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.xlsx,.mp4,.zip"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="target_type">ط§ظ„ظپط¦ط© ط§ظ„ظ…ط³طھظ‡ط¯ظپط©</Label>
        <select
          id="target_type"
          name="target_type"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm sm:w-64"
        >
          <option value="all">ط§ظ„ط¬ظ…ظٹط¹</option>
          <option value="role">ط¯ظˆط± ظ…ط­ط¯ط¯</option>
          <option value="class">ظپطµظ„ ظ…ط­ط¯ط¯</option>
          <option value="branch">ط´ط¹ط¨ط© ظ…ط­ط¯ط¯ط©</option>
          <option value="student">ط·ط§ظ„ط¨ ظ…ط­ط¯ط¯</option>
        </select>
      </div>

      {targetType === "role" && (
        <div className="space-y-2">
          <Label htmlFor="target_role">ط§ظ„ط¯ظˆط±</Label>
          <select
            id="target_role"
            name="target_role"
            className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm sm:w-64"
          >
            <option value="student">ط§ظ„ط·ظ„ط§ط¨</option>
            <option value="parent">ط£ظˆظ„ظٹط§ط، ط§ظ„ط£ظ…ظˆط±</option>
            <option value="teacher">ط§ظ„ظ…ط¯ط±ط³ظˆظ†</option>
          </select>
        </div>
      )}

      {targetType === "class" && (
        <div className="space-y-2">
          <Label htmlFor="target_class_id">ط§ظ„ظپطµظ„</Label>
          <select
            id="target_class_id"
            name="target_class_id"
            className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm sm:w-64"
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
          <Label htmlFor="target_branch">ط§ظ„ط´ط¹ط¨ط©</Label>
          <select
            id="target_branch"
            name="target_branch"
            className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm sm:w-64"
          >
            <option value="Arabic">ط¹ط±ط¨ظٹ</option>
            <option value="Languages">ظ„ط؛ط§طھ</option>
          </select>
        </div>
      )}

      {targetType === "student" && (
        <div className="space-y-2">
          <Label htmlFor="target_student_code">ظƒظˆط¯ ط§ظ„ط·ط§ظ„ط¨</Label>
          <Input
            id="target_student_code"
            name="target_student_code"
            dir="ltr"
            className="sm:w-64"
          />
        </div>
      )}

      <Button type="submit">ظ†ط´ط± ط§ظ„ط¥ط¹ظ„ط§ظ†</Button>
    </form>
  );
}
