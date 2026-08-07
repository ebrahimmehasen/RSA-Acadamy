"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDeleteButton } from "@/components/shared/ConfirmDeleteButton";
import { deleteStudent, toggleStudentActive } from "./actions";

export interface StudentRow {
  user_id: number;
  student_code: string;
  branch: string;
  is_active: boolean;
  parent_id: number | null;
  full_name: string;
  phone: string | null;
  class_name: string | null;
}

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.student_code.includes(q) ||
        (s.phone ?? "").includes(q),
    );
  }, [students, query]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="بحث بالاسم / كود الطالب / الهاتف..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-sm"
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">كود الطالب</TableHead>
            <TableHead className="text-right">الصف</TableHead>
            <TableHead className="text-right">الشعبة</TableHead>
            <TableHead className="text-right">ولي الأمر</TableHead>
            <TableHead className="text-right">الحالة</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((s) => (
            <TableRow key={s.user_id}>
              <TableCell>
                <Link
                  href={`/admin/students/${s.user_id}`}
                  className="hover:underline"
                >
                  {s.full_name}
                </Link>
              </TableCell>
              <TableCell dir="ltr" className="text-right font-mono">
                {s.student_code}
              </TableCell>
              <TableCell>{s.class_name}</TableCell>
              <TableCell>{s.branch === "Arabic" ? "عربي" : "لغات"}</TableCell>
              <TableCell>
                {s.parent_id ? (
                  <Badge>مربوط</Badge>
                ) : (
                  <Badge variant="outline">غير مربوط</Badge>
                )}
              </TableCell>
              <TableCell>
                {s.is_active ? (
                  <Badge>نشط</Badge>
                ) : (
                  <Badge variant="destructive">موقوف</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <form action={toggleStudentActive}>
                    <input type="hidden" name="student_id" value={s.user_id} />
                    <input
                      type="hidden"
                      name="is_active"
                      value={String(s.is_active)}
                    />
                    <Button variant="outline" size="xs" type="submit">
                      {s.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                  </form>
                  <ConfirmDeleteButton
                    action={deleteStudent}
                    hiddenFields={{ student_id: s.user_id }}
                    confirmMessage={`متأكد إنك عايز تحذف الطالب "${s.full_name}"؟ الإجراء ده نهائي ومش هيتراجع — هيتحذف كل بياناته (تسليمات، درجات).`}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                مفيش نتائج
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
