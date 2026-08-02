"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  submitPaymentProof,
  type SubmitProofResult,
} from "@/app/(parent)/parent/payments/actions";

export function PaymentProofForm({
  instructionId,
  studentId,
}: {
  instructionId: number;
  studentId: number;
}) {
  const [result, formAction, isPending] = useActionState<
    SubmitProofResult | null,
    FormData
  >(submitPaymentProof, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="instruction_id" value={instructionId} />
      <input type="hidden" name="student_id" value={studentId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`file-${instructionId}-${studentId}`}>
            إثبات التحويل (صورة أو PDF، ≤5MB)
          </Label>
          <Input
            id={`file-${instructionId}-${studentId}`}
            name="file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tx-${instructionId}-${studentId}`}>
            رقم العملية (اختياري)
          </Label>
          <Input
            id={`tx-${instructionId}-${studentId}`}
            name="transaction_id"
            dir="ltr"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`msg-${instructionId}-${studentId}`}>
          رسالة للإدارة (اختياري)
        </Label>
        <Input id={`msg-${instructionId}-${studentId}`} name="payer_message" />
      </div>

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
        >
          {result.message}
        </p>
      )}

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "جاري الرفع..." : "رفع الإثبات"}
      </Button>
    </form>
  );
}
