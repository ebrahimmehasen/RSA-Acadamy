"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { editSubjectName } from "./actions";

export function EditSubjectName({
  subjectId,
  subjectName,
}: {
  subjectId: string;
  subjectName: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span>{subjectName}</span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          تعديل
        </button>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await editSubjectName(formData);
        setEditing(false);
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="subject_id" value={subjectId} />
      <Input
        name="subject_name"
        defaultValue={subjectName}
        className="h-7 w-40 text-sm"
        required
        minLength={2}
      />
      <Button type="submit" size="xs">
        حفظ
      </Button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        إلغاء
      </button>
    </form>
  );
}
