"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { branchLabel } from "@/lib/subjects";
import { savePreferences, type PreferencesResult } from "./actions";

export interface SubjectRow {
  subject_id: string;
  subject_name: string;
  branch: "Arabic" | "Languages";
  class_name: string;
}

export function PreferencesForm({
  subjectsByBranch,
  classes,
  initialSubjects,
  initialClasses,
}: {
  subjectsByBranch: { Arabic: SubjectRow[]; Languages: SubjectRow[] };
  classes: { id: number; class_name: string }[];
  initialSubjects: string[];
  initialClasses: number[];
}) {
  const [result, formAction, isPending] = useActionState<
    PreferencesResult | null,
    FormData
  >(savePreferences, null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-medium">المواد التي يمكنك تدريسها</p>
        {(["Arabic", "Languages"] as const).map((branch) => {
          const subs = subjectsByBranch[branch];
          if (subs.length === 0) return null;
          return (
            <div key={branch} className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {branch === "Arabic" ? "عربي" : "لغات"}
              </p>
              <div className="grid grid-cols-1 gap-1.5 rounded-lg border p-3 sm:grid-cols-2">
                {subs.map((s) => (
                  <label
                    key={s.subject_id}
                    className="flex min-h-8 items-center gap-2 text-sm"
                  >
                    <Checkbox
                      name="subjects"
                      value={s.subject_id}
                      defaultChecked={initialSubjects.includes(s.subject_id)}
                    />
                    <span className="min-w-0 truncate">
                      {s.subject_name} {branchLabel(s.subject_name, s.branch)}{" "}
                      <span className="text-muted-foreground">
                        — {s.class_name}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">الفصول المفضّلة</p>
        <p className="text-xs text-muted-foreground">
          تساعد الإدارة على توزيع الجدول بشكل أفضل، وهي غير إلزامية
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {classes.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="classes"
                value={String(c.id)}
                defaultChecked={initialClasses.includes(c.id)}
              />
              {c.class_name}
            </label>
          ))}
        </div>
      </div>

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
          aria-live="polite"
        >
          {result.message}
        </p>
      )}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "جاري الحفظ…" : "حفظ التفضيلات"}
      </Button>
    </form>
  );
}
