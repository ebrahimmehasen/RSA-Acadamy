"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyableSecret } from "@/components/shared/CopyableSecret";
import {
  editTeacherAction,
  resetTeacherPasswordAction,
  type EditTeacherResult,
  type ResetPasswordResult,
} from "../actions";

export function EditTeacherForm({
  teacherId,
  fullName,
  email,
  phone,
  specialization,
  qualification,
}: {
  teacherId: number;
  fullName: string;
  email: string;
  phone: string | null;
  specialization: string | null;
  qualification: string | null;
}) {
  const [editResult, editAction, editPending] = useActionState<
    EditTeacherResult | null,
    FormData
  >(editTeacherAction, null);
  const [resetResult, resetAction, resetPending] = useActionState<
    ResetPasswordResult | null,
    FormData
  >(resetTeacherPasswordAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تعديل بيانات المدرس</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={editAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="teacher_id" value={teacherId} />
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              defaultValue={fullName}
              required
            />
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
              defaultValue={email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              inputMode="tel"
              defaultValue={phone ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specialization">التخصص</Label>
            <Input
              id="specialization"
              name="specialization"
              defaultValue={specialization ?? ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qualification">المؤهل العلمي (اختياري)</Label>
            <Input
              id="qualification"
              name="qualification"
              defaultValue={qualification ?? ""}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={editPending}>
              {editPending ? "جاري الحفظ…" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
        {editResult && (
          <p
            className={`text-sm ${editResult.ok ? "text-green-600" : "text-destructive"}`}
            aria-live="polite"
          >
            {editResult.message}
          </p>
        )}

        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <form
              action={resetAction}
              onSubmit={(e) => {
                if (
                  !confirm(
                    `هل أنت متأكد من رغبتك في إعادة تعيين كلمة سر "${fullName}"؟ ستُلغى كلمة السر الحالية فورًا.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="teacher_id" value={teacherId} />
              <Button type="submit" variant="outline" disabled={resetPending}>
                {resetPending ? "جاري إعادة التعيين…" : "إعادة تعيين كلمة السر"}
              </Button>
            </form>
            {resetResult?.ok && resetResult.password && (
              <CopyableSecret value={resetResult.password} />
            )}
          </div>
          <div aria-live="polite">
            {resetResult?.ok && resetResult.password && (
              <p className="mt-2 text-xs text-muted-foreground">
                ⚠️ اضغط على المربع لنسخ كلمة السر وسلّمها إلى المدرس، فلن تظهر مرة أخرى
              </p>
            )}
            {resetResult && !resetResult.ok && (
              <p className="mt-2 text-sm text-destructive">{resetResult.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
