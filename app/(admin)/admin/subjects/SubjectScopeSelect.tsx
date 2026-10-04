"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { SELECT_CLASS } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { BRANCH_SCOPE_LABEL, type BranchScope } from "@/lib/subjects";
import { setSubjectScope, type SubjectScopeResult } from "./actions";

const SCOPES: BranchScope[] = ["Arabic", "Languages", "Both"];

/** Per-subject "who studies it" — saving updates the students right away. */
export function SubjectScopeSelect({
  subjectId,
  subjectName,
  scope,
}: {
  subjectId: string;
  subjectName: string;
  scope: BranchScope;
}) {
  const [value, setValue] = useState<BranchScope>(scope);
  const [result, setResult] = useState<SubjectScopeResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(next: BranchScope) {
    if (next === value) return;
    const confirmMsg =
      next === "Both"
        ? `جعل «${subjectName}» مادة واحدة للشعبتين؟ سيُنقل طلاب الشعبة الأخرى إليها، وتتوقف نسختها الأخرى (الدرجات القديمة محفوظة).`
        : `جعل «${subjectName}» لـ${BRANCH_SCOPE_LABEL[next]}؟ سيُحدَّث تسجيل الطلاب فورًا.`;
    if (!window.confirm(confirmMsg)) return;
    const previous = value;
    setValue(next);
    setResult(null);
    startTransition(async () => {
      const res = await setSubjectScope(subjectId, next);
      setResult(res);
      if (!res.ok) setValue(previous);
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <select
          aria-label={`من يدرس ${subjectName}`}
          value={value}
          disabled={isPending}
          onChange={(e) => change(e.target.value as BranchScope)}
          className={cn(SELECT_CLASS, "w-32")}
        >
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {BRANCH_SCOPE_LABEL[s]}
            </option>
          ))}
        </select>
        {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>
      {result && (
        <p
          className={cn("text-xs", result.ok ? "text-muted-foreground" : "text-destructive")}
          aria-live="polite"
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
