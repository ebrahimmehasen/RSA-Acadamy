"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ColumnHeader {
  id: number;
  label: string;
  max: number;
}

interface Cell {
  value: number | null;
  max: number;
  status: "graded" | "submitted" | "late" | "missing" | "pending";
}

export interface StudentRow {
  id: number;
  name: string;
  code: string;
  assignmentCells: Cell[];
  quizCells: Cell[];
  avgAssignment: number | null;
  avgQuiz: number | null;
  overallAvg: number | null;
  lateCount: number;
}

type SortKey = "name" | "average" | "late";

function CellBadge({ cell }: { cell: Cell }) {
  if (cell.status === "graded") {
    return (
      <span dir="ltr" className="font-mono text-sm">
        {cell.value}/{cell.max}
      </span>
    );
  }
  if (cell.status === "late") {
    return (
      <Badge variant="destructive" className="text-xs">
        متأخر
      </Badge>
    );
  }
  if (cell.status === "submitted") {
    return (
      <Badge variant="secondary" className="text-xs">
        قيد التصحيح
      </Badge>
    );
  }
  if (cell.status === "missing") {
    return (
      <Badge variant="destructive" className="text-xs">
        لم يسلم
      </Badge>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

export function GradebookTable({
  students,
  assignmentHeaders,
  quizHeaders,
}: {
  students: StudentRow[];
  assignmentHeaders: ColumnHeader[];
  quizHeaders: ColumnHeader[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = q
      ? students.filter(
          (s) => s.name.toLowerCase().includes(q) || s.code.includes(q),
        )
      : students;

    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "ar");
      else if (sortKey === "average")
        cmp = (a.overallAvg ?? -1) - (b.overallAvg ?? -1);
      else if (sortKey === "late") cmp = a.lateCount - b.lateCount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [students, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="بحث بالاسم أو كود الطالب..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer whitespace-nowrap text-right"
                onClick={() => toggleSort("name")}
              >
                الطالب{sortArrow("name")}
              </TableHead>
              {assignmentHeaders.map((h) => (
                <TableHead key={`a-${h.id}`} className="whitespace-nowrap text-center">
                  <Link
                    href={`/teacher/assignments/${h.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {h.label}
                  </Link>
                </TableHead>
              ))}
              {quizHeaders.map((h) => (
                <TableHead key={`q-${h.id}`} className="whitespace-nowrap text-center">
                  <Link
                    href={`/teacher/quizzes/${h.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {h.label}
                  </Link>
                </TableHead>
              ))}
              <TableHead
                className="cursor-pointer whitespace-nowrap text-center"
                onClick={() => toggleSort("average")}
              >
                المتوسط العام{sortArrow("average")}
              </TableHead>
              <TableHead
                className="cursor-pointer whitespace-nowrap text-center"
                onClick={() => toggleSort("late")}
              >
                مرات التأخير{sortArrow("late")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-nowrap">
                  <p className="font-medium">{s.name}</p>
                  <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                    {s.code}
                  </p>
                </TableCell>
                {s.assignmentCells.map((c, i) => (
                  <TableCell key={`a-${i}`} className="text-center">
                    <CellBadge cell={c} />
                  </TableCell>
                ))}
                {s.quizCells.map((c, i) => (
                  <TableCell key={`q-${i}`} className="text-center">
                    <CellBadge cell={c} />
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  {s.overallAvg !== null ? (
                    <span className="font-mono font-medium" dir="ltr">
                      {s.overallAvg}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span
                    className={cn(
                      "font-mono",
                      s.lateCount > 0 && "font-semibold text-destructive",
                    )}
                  >
                    {s.lateCount}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3 + assignmentHeaders.length + quizHeaders.length}
                  className="text-center text-muted-foreground"
                >
                  مفيش طلاب مطابقين للبحث
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
