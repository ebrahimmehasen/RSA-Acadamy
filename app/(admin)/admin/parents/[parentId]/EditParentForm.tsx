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
import {
  editParentAction,
  resetParentPasswordAction,
  type EditParentResult,
  type ResetPasswordResult,
} from "../actions";

export function EditParentForm({
  parentId,
  fullName,
  email,
  phone,
  address,
}: {
  parentId: number;
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
}) {
  const [editResult, editAction, editPending] = useActionState<
    EditParentResult | null,
    FormData
  >(editParentAction, null);
  const [resetResult, resetAction, resetPending] = useActionState<
    ResetPasswordResult | null,
    FormData
  >(resetParentPasswordAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تعديل بيانات ولي الأمر</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={editAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="parent_id" value={parentId} />
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" name="full_name" defaultValue={fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              dir="ltr"
              defaultValue={email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">الهاتف</Label>
            <Input id="phone" name="phone" dir="ltr" defaultValue={phone ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">العنوان (اختياري)</Label>
            <Input id="address" name="address" defaultValue={address ?? ""} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={editPending}>
              {editPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
        {editResult && (
          <p
            className={`text-sm ${editResult.ok ? "text-green-600" : "text-destructive"}`}
          >
            {editResult.message}
          </p>
        )}

        <div className="border-t pt-4">
          <form action={resetAction} className="flex items-end gap-3">
            <input type="hidden" name="parent_id" value={parentId} />
            <Button type="submit" variant="outline" disabled={resetPending}>
              {resetPending ? "جاري إعادة التعيين..." : "إعادة تعيين كلمة السر"}
            </Button>
          </form>
          {resetResult?.ok && resetResult.password && (
            <div className="mt-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm dark:bg-green-950">
              <p dir="ltr">
                كلمة السر الجديدة: <b>{resetResult.password}</b>
              </p>
              <p className="text-muted-foreground">
                ⚠️ انسخها دلوقتي وسلّمها لولي الأمر — مش هتظهر تاني
              </p>
            </div>
          )}
          {resetResult && !resetResult.ok && (
            <p className="mt-2 text-sm text-destructive">{resetResult.message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
