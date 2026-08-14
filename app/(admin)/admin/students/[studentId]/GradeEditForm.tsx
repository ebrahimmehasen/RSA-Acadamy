"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GradeEditForm({
  action,
  hiddenFields,
  gradeFieldName,
  defaultValue,
  max,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string | number>;
  gradeFieldName: string;
  defaultValue: number | null;
  max: number;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Button variant="outline" size="xs" onClick={() => setEditing(true)}>
        تعديل الدرجة
      </Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await action(formData);
        setEditing(false);
      }}
      className="flex items-center gap-2"
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Input
        name={gradeFieldName}
        type="number"
        min={0}
        max={max}
        defaultValue={defaultValue ?? ""}
        dir="ltr"
        required
        className="w-20"
      />
      <Button size="xs" type="submit">
        حفظ
      </Button>
      <Button variant="outline" size="xs" type="button" onClick={() => setEditing(false)}>
        إلغاء
      </Button>
    </form>
  );
}
