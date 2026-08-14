"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchStudents, linkChild, type StudentSearchResult } from "./actions";

export function LinkChildForm({ parentId }: { parentId: number }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function doSearch() {
    startTransition(async () => {
      const r = await searchStudents(query);
      setResults(r);
      setSearched(true);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">ربط ابن جديد</p>
      <div className="flex gap-2">
        <Input
          placeholder="اسم الطالب أو الكود"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), doSearch())}
        />
        <Button type="button" size="sm" onClick={doSearch} disabled={isPending}>
          {isPending ? "جاري البحث..." : "بحث"}
        </Button>
      </div>

      {searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">مفيش طلاب مطابقين</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <span>
                {r.name}{" "}
                <span className="font-mono text-muted-foreground" dir="ltr">
                  ({r.code})
                </span>{" "}
                — {r.className}
                {r.hasParent && (
                  <span className="text-destructive"> · مربوط بولي أمر تاني بالفعل</span>
                )}
              </span>
              <form action={linkChild}>
                <input type="hidden" name="student_id" value={r.id} />
                <input type="hidden" name="parent_id" value={parentId} />
                <Button size="xs" type="submit">
                  ربط
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
