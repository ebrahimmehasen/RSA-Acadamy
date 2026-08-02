export interface GradedRow {
  grade: number;
  max_grade: number;
  subject_name: string;
  title: string;
  graded_at: string | null;
}

export interface GradesSummary {
  average: number | null;
  bySubject: {
    subject: string;
    average: number;
    count: number;
    items: { title: string; grade: number; max: number }[];
  }[];
  trend: { label: string; percent: number }[];
}

export function summarizeGrades(rows: GradedRow[]): GradesSummary {
  if (rows.length === 0) return { average: null, bySubject: [], trend: [] };

  const percents = rows.map((r) => (r.grade / r.max_grade) * 100);
  const average =
    Math.round(
      (percents.reduce((a, b) => a + b, 0) / percents.length) * 10,
    ) / 10;

  const subjectMap = new Map<
    string,
    { total: number; count: number; items: { title: string; grade: number; max: number }[] }
  >();
  for (const row of rows) {
    const entry = subjectMap.get(row.subject_name) ?? {
      total: 0,
      count: 0,
      items: [],
    };
    entry.total += (row.grade / row.max_grade) * 100;
    entry.count += 1;
    entry.items.push({ title: row.title, grade: row.grade, max: row.max_grade });
    subjectMap.set(row.subject_name, entry);
  }

  const bySubject = [...subjectMap.entries()]
    .map(([subject, { total, count, items }]) => ({
      subject,
      average: Math.round((total / count) * 10) / 10,
      count,
      items,
    }))
    .sort((a, b) => b.average - a.average);

  const trend = rows
    .filter((r) => r.graded_at)
    .sort(
      (a, b) =>
        new Date(a.graded_at!).getTime() - new Date(b.graded_at!).getTime(),
    )
    .map((r) => ({
      label: new Date(r.graded_at!).toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "short",
      }),
      percent: Math.round((r.grade / r.max_grade) * 1000) / 10,
    }));

  return { average, bySubject, trend };
}
