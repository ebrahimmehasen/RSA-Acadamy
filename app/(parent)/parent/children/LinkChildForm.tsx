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
import { linkChildByCode, type LinkChildResult } from "./actions";

export function LinkChildForm() {
  const [result, formAction, isPending] = useActionState<
    LinkChildResult | null,
    FormData
  >(linkChildByCode, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">ربط ابن/ابنة</CardTitle>
        <CardDescription>
          اكتب كود الطالب المكوّن من 6 أرقام (موجود مع الطالب أو من الإدارة)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="student_code">كود الطالب</Label>
            <Input
              id="student_code"
              name="student_code"
              dir="ltr"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="847392"
              required
              className="w-36 text-center font-mono"
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "جاري الربط..." : "ربط"}
          </Button>
          {result && (
            <p
              className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
            >
              {result.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
