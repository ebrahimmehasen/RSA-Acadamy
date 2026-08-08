"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminAction, type CreateAdminResult } from "./actions";

export function CreateAdminForm() {
  const [result, formAction, isPending] = useActionState<
    CreateAdminResult | null,
    FormData
  >(createAdminAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">إضافة مسؤول جديد</CardTitle>
        <CardDescription>
          هيكون له نفس صلاحياتك الكاملة في لوحة الإدارة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={formAction}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input id="full_name" name="full_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" name="email" type="email" dir="ltr" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">كلمة السر</Label>
            <Input
              id="password"
              name="password"
              type="password"
              dir="ltr"
              minLength={8}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "جاري الإنشاء..." : "إنشاء المسؤول"}
            </Button>
          </div>
        </form>

        {result && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              result.ok
                ? "border-green-300 bg-green-50 dark:bg-green-950"
                : "border-destructive bg-destructive/10"
            }`}
          >
            <p className="font-medium">{result.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
