"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUpAction, type SignUpResult } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  student: "طالب",
  teacher: "مدرس",
  parent: "ولي أمر",
};

const QUALIFICATIONS = ["بكالوريوس", "ماجستير", "دكتوراه", "أخرى"];

interface SubjectRow {
  subject_id: string;
  subject_name: string;
  branch: string;
  class_name: string;
}

// Everything except the password and the two file inputs (profile picture,
// CV) — those three can't safely or technically survive a refresh: a
// password shouldn't sit in localStorage in plain text, and browsers won't
// let JS repopulate a file input for security reasons either way.
interface SignUpDraft {
  full_name: string;
  role: string;
  email: string;
  phone: string;
  date_of_birth: string;
  class_id: string;
  branch: string;
  address: string;
  qualification: string;
  specialization: string;
  subjects: string[];
}

const EMPTY_DRAFT: SignUpDraft = {
  full_name: "",
  role: "student",
  email: "",
  phone: "",
  date_of_birth: "",
  class_id: "",
  branch: "",
  address: "",
  qualification: "",
  specialization: "",
  subjects: [],
};

const DRAFT_KEY = "rsa-signup-draft";

export function SignUpForm({
  classes,
  subjects,
}: {
  classes: { id: number; class_name: string }[];
  subjects: SubjectRow[];
}) {
  const [result, formAction, isPending] = useActionState<
    SignUpResult | null,
    FormData
  >(signUpAction, null);

  const [draft, setDraft] = useState<SignUpDraft>(EMPTY_DRAFT);

  // Restore a saved draft once the component mounts (localStorage isn't
  // available during server rendering). Runs once — a brief flash from
  // empty to saved values is expected and harmless.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      // Can only read localStorage client-side; this runs once, right after
      // mount, to restore a draft the server had no way to render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setDraft({ ...EMPTY_DRAFT, ...JSON.parse(saved) });
    } catch {
      // corrupted or inaccessible (private browsing) — just start fresh
    }
  }, []);

  // Clear the draft once the account is actually created.
  useEffect(() => {
    if (result?.ok) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }
    }
  }, [result?.ok]);

  function update<K extends keyof SignUpDraft>(key: K, value: SignUpDraft[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        // storage full or unavailable — form still works, just won't persist
      }
      return next;
    });
  }

  function toggleSubject(subjectId: string, checked: boolean) {
    update(
      "subjects",
      checked
        ? [...draft.subjects, subjectId]
        : draft.subjects.filter((id) => id !== subjectId),
    );
  }

  const phoneRequired = draft.role === "parent" || draft.role === "teacher";

  const subjectsByClass = useMemo(() => {
    const map = new Map<string, SubjectRow[]>();
    for (const s of subjects) {
      if (!map.has(s.class_name)) map.set(s.class_name, []);
      map.get(s.class_name)!.push(s);
    }
    return [...map.entries()];
  }, [subjects]);

  return (
    <Card className="w-full max-w-sm" dir="rtl">
      <CardHeader>
        <CardTitle>إنشاء حساب جديد</CardTitle>
        <CardDescription>
          حسابك هيفضل مقفول لحد ما إدارة RSA Academy تفعّله
        </CardDescription>
      </CardHeader>
      <CardContent>
        {result?.ok ? (
          <div className="space-y-3 text-sm" aria-live="polite">
            <p className="text-green-600">{result.message}</p>
            <Link
              href="/login"
              className="text-primary underline underline-offset-4"
            >
              تسجيل الدخول
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4" encType="multipart/form-data">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
                minLength={3}
                value={draft.full_name}
                onChange={(e) => update("full_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">نوع الحساب</Label>
              <select
                id="role"
                name="role"
                required
                value={draft.role}
                onChange={(e) => update("role", e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                spellCheck={false}
                required
                value={draft.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                رقم الهاتف {phoneRequired ? "" : "(اختياري)"}
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                dir="ltr"
                autoComplete="tel"
                inputMode="tel"
                required={phoneRequired}
                value={draft.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة السر</Label>
              <Input
                id="password"
                name="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                كلمة السر ما بتتحفظش لو عملت ريفريش، لازم تكتبها تاني للأمان
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_picture">الصورة الشخصية (اختياري)</Label>
              <Input
                id="profile_picture"
                name="profile_picture"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
              />
            </div>

            {draft.role === "student" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">تاريخ الميلاد</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    dir="ltr"
                    required
                    value={draft.date_of_birth}
                    onChange={(e) => update("date_of_birth", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class_id">الصف الدراسي</Label>
                  <select
                    id="class_id"
                    name="class_id"
                    required
                    value={draft.class_id}
                    onChange={(e) => update("class_id", e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm"
                  >
                    <option value="" disabled>
                      اختر الصف الدراسي
                    </option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch">الشعبة (اختياري)</Label>
                  <select
                    id="branch"
                    name="branch"
                    value={draft.branch}
                    onChange={(e) => update("branch", e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="Arabic">عربي</option>
                    <option value="Languages">لغات</option>
                  </select>
                </div>
              </>
            )}

            {draft.role === "parent" && (
              <div className="space-y-2">
                <Label htmlFor="address">العنوان (اختياري)</Label>
                <Input
                  id="address"
                  name="address"
                  value={draft.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </div>
            )}

            {draft.role === "teacher" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="qualification">المؤهل العلمي (اختياري)</Label>
                  <select
                    id="qualification"
                    name="qualification"
                    value={draft.qualification}
                    onChange={(e) => update("qualification", e.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-background text-foreground px-2 text-sm"
                  >
                    <option value="">اختر المؤهل</option>
                    {QUALIFICATIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">التخصص</Label>
                  <Input
                    id="specialization"
                    name="specialization"
                    required
                    value={draft.specialization}
                    onChange={(e) => update("specialization", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cv">السيرة الذاتية (CV) — PDF أو Word</Label>
                  <Input
                    id="cv"
                    name="cv"
                    type="file"
                    accept="application/pdf,.doc,.docx"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>المواد اللي تقدر تدرّسها (اختياري)</Label>
                  <div className="max-h-48 space-y-3 overflow-y-auto rounded-lg border p-3">
                    {subjectsByClass.map(([className, subs]) => (
                      <div key={className} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {className}
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {subs.map((s) => (
                            <label
                              key={s.subject_id}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Checkbox
                                name="subjects"
                                value={s.subject_id}
                                checked={draft.subjects.includes(s.subject_id)}
                                onCheckedChange={(checked) =>
                                  toggleSubject(s.subject_id, checked === true)
                                }
                              />
                              {s.subject_name}{" "}
                              {s.branch === "Arabic" ? "(عربي)" : "(لغات)"}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {result && !result.ok && (
              <p className="text-sm text-destructive" aria-live="polite">
                {result.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "جاري الإنشاء…" : "إنشاء الحساب"}
            </Button>
            <Link
              href="/login"
              className="block text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              عندك حساب بالفعل؟ سجّل الدخول
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
