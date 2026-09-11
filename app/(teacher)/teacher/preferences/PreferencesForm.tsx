"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { branchLabel } from "@/lib/subjects";
import { savePreferences, type PreferencesResult } from "./actions";

export interface SubjectRow {
  subject_id: string;
  subject_name: string;
  branch: "Arabic" | "Languages";
}

export function PreferencesForm({
  classes,
  subjectsByClass,
  initialSubjects,
  initialClasses,
}: {
  classes: { id: number; class_name: string }[];
  subjectsByClass: Record<number, { Arabic: SubjectRow[]; Languages: SubjectRow[] }>;
  initialSubjects: string[];
  initialClasses: number[];
}) {
  const [result, formAction, isPending] = useActionState<
    PreferencesResult | null,
    FormData
  >(savePreferences, null);

  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(
    () => new Set(initialClasses),
  );
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(
    () => new Set(initialSubjects),
  );

  function toggleClass(id: number, checked: boolean) {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSubject(id: string, checked: boolean) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function SubjectColumn({ label, subs }: { label: string; subs: SubjectRow[] }) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {subs.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد مواد</p>
        ) : (
          <div className="space-y-1">
            {subs.map((s) => (
              <label
                key={s.subject_id}
                className="flex min-h-8 items-center gap-2 text-sm"
              >
                <Checkbox
                  name="subjects"
                  value={s.subject_id}
                  checked={selectedSubjects.has(s.subject_id)}
                  onCheckedChange={(checked) =>
                    toggleSubject(s.subject_id, checked === true)
                  }
                />
                <span className="min-w-0 truncate">
                  {s.subject_name} {branchLabel(s.subject_name, s.branch)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">الفصول</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {classes.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                name="classes"
                value={String(c.id)}
                checked={selectedClasses.has(c.id)}
                onCheckedChange={(checked) => toggleClass(c.id, checked === true)}
              />
              {c.class_name}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {classes
          .filter((c) => selectedClasses.has(c.id))
          .map((c) => {
            const subs = subjectsByClass[c.id] ?? { Arabic: [], Languages: [] };
            return (
              <div key={c.id} className="space-y-2 rounded-lg border p-3">
                <p className="text-sm font-semibold">{c.class_name}</p>
                <div className="grid grid-cols-2 gap-4">
                  <SubjectColumn label="عربي" subs={subs.Arabic} />
                  <SubjectColumn label="لغات" subs={subs.Languages} />
                </div>
              </div>
            );
          })}
        {selectedClasses.size === 0 && (
          <p className="text-xs text-muted-foreground">
            اختر فصلاً من فوق لعرض مواده
          </p>
        )}
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
