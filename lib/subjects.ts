/**
 * Which student branches study a subject row — set per subject by the
 * admin (subjects.branch_scope, migration 0031). 'Both' means one copy of
 * the subject for the whole class: same teacher, schedule and grade sheet.
 */
export type BranchScope = "Arabic" | "Languages" | "Both";

export const BRANCH_SCOPE_LABEL: Record<BranchScope, string> = {
  Arabic: "العربي فقط",
  Languages: "اللغات فقط",
  Both: "الشعبتين",
};

/** "(عربي)" / "(لغات)", or "" for a subject studied by both branches. */
export function branchLabel(scope: string): string {
  if (scope === "Both") return "";
  return scope === "Arabic" ? "(عربي)" : "(لغات)";
}

/** Does a student of `studentBranch` study a subject with this scope? */
export function scopeIncludes(scope: string | null | undefined, studentBranch: string): boolean {
  return scope === "Both" || scope === studentBranch;
}

/** A student's own branch, in Arabic — "عربي" / "لغات" / "خاص". */
export function studentBranchLabel(branch: string | null): string {
  if (branch === "Arabic") return "عربي";
  if (branch === "Private") return "خاص";
  if (branch === "Languages") return "لغات";
  return "—";
}
