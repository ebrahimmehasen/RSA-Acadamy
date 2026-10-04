"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTicketedSubmit } from "@/lib/uploads/useTicketedSubmit";
import { updateProfile, type UpdateProfileResult } from "./actions";

export function ProfileForm({
  fullName,
  phone,
  email,
  pictureUrl,
}: {
  fullName: string;
  phone: string | null;
  email: string;
  pictureUrl: string | null;
}) {
  const [result, formAction, isPending] = useActionState<
    UpdateProfileResult | null,
    FormData
  >(updateProfile, null);
  const upload = useTicketedSubmit(formAction, [
    { name: "profile_picture", kind: "profile_picture", ticketName: "profile_picture_ticket" },
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">البيانات الشخصية</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={upload.onSubmit} className="space-y-4">
          {pictureUrl && (
            <Image
              src={pictureUrl}
              alt={fullName}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
              unoptimized
            />
          )}
          <div className="space-y-2">
            <Label htmlFor="profile_picture">الصورة الشخصية (اختياري)</Label>
            <Input
              id="profile_picture"
              name="profile_picture"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
            />
          </div>
          <div className="space-y-2">
            <Label>البريد الإلكتروني</Label>
            <Input value={email} dir="ltr" readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">الاسم الكامل</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              defaultValue={fullName}
              required
              minLength={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              dir="ltr"
              autoComplete="tel"
              defaultValue={phone ?? ""}
            />
          </div>
          {upload.uploadError && (
            <p className="text-sm text-destructive" aria-live="polite">
              {upload.uploadError}
            </p>
          )}
          {result && (
            <p
              className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
              aria-live="polite"
            >
              {result.message}
            </p>
          )}
          <Button type="submit" disabled={isPending || upload.busy}>
            {upload.uploading ? "جاري رفع الصورة…" : isPending || upload.busy ? "جاري الحفظ…" : "حفظ التعديلات"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
