/**
 * Some subjects are duplicated per (class, branch) in the DB — e.g.
 * "اللغة العربية" and "التربية الدينية" each exist as a separate row for
 * the Arabic branch and the Languages branch, so grading/enrollment can
 * be scoped per class+branch like every other subject. But the subject
 * itself isn't actually branch-specific content — every student studies
 * the same Arabic language and religion curriculum regardless of branch
 * — so labelling them "(عربي)"/"(لغات)" next to the name is misleading
 * rather than informative. Everything else (English, Math, Science…)
 * genuinely differs by branch and keeps its label.
 */
const SHARED_ACROSS_BRANCHES = new Set(["اللغة العربية", "التربية الدينية"]);

/** True for subjects taught the same in both branches (see note above). */
export function isSharedAcrossBranches(subjectName: string): boolean {
  return SHARED_ACROSS_BRANCHES.has(subjectName);
}

/** "(عربي)" / "(لغات)", or "" for subjects taught the same in both branches. */
export function branchLabel(subjectName: string, branch: string): string {
  if (isSharedAcrossBranches(subjectName)) return "";
  return branch === "Arabic" ? "(عربي)" : "(لغات)";
}

/** A student's own branch, in Arabic — "عربي" / "لغات" / "خاص". */
export function studentBranchLabel(branch: string | null): string {
  if (branch === "Arabic") return "عربي";
  if (branch === "Private") return "خاص";
  if (branch === "Languages") return "لغات";
  return "—";
}
