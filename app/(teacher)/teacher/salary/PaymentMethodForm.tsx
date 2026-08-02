"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePaymentMethod, type SaveMethodResult } from "./actions";

export function PaymentMethodForm() {
  const [method, setMethod] = useState("bank_transfer");
  const [result, formAction, isPending] = useActionState<
    SaveMethodResult | null,
    FormData
  >(savePaymentMethod, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label>طريقة استلام الراتب</Label>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            { value: "bank_transfer", label: "تحويل بنكي 🏦" },
            { value: "instapay", label: "InstaPay 📱" },
            { value: "e_wallet", label: "محفظة إلكترونية 💳" },
          ].map((option) => (
            <label key={option.value} className="flex items-center gap-2">
              <input
                type="radio"
                name="payment_method"
                value={option.value}
                checked={method === option.value}
                onChange={() => setMethod(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {method === "bank_transfer" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="bank_name">اسم البنك</Label>
            <Input id="bank_name" name="bank_name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account_holder_name">اسم صاحب الحساب</Label>
            <Input id="account_holder_name" name="account_holder_name" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account_number">رقم الحساب</Label>
            <Input id="account_number" name="account_number" dir="ltr" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" dir="ltr" />
          </div>
        </div>
      )}

      {method === "instapay" && (
        <div className="space-y-1">
          <Label htmlFor="instapay_phone">رقم الهاتف المسجل في InstaPay</Label>
          <Input
            id="instapay_phone"
            name="instapay_phone"
            dir="ltr"
            placeholder="01xxxxxxxxx"
          />
        </div>
      )}

      {method === "e_wallet" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="wallet_provider">المحفظة</Label>
            <select
              id="wallet_provider"
              name="wallet_provider"
              className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="vodafone">Vodafone Cash</option>
              <option value="orange">Orange Money</option>
              <option value="etisalat">Etisalat Cash</option>
              <option value="cib">CIB Wallet</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wallet_phone">رقم المحفظة</Label>
            <Input
              id="wallet_phone"
              name="wallet_phone"
              dir="ltr"
              placeholder="01xxxxxxxxx"
            />
          </div>
        </div>
      )}

      {result && (
        <p
          className={`text-sm ${result.ok ? "text-green-600" : "text-destructive"}`}
        >
          {result.message}
        </p>
      )}

      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "جاري الحفظ..." : "حفظ طريقة الدفع"}
      </Button>
    </form>
  );
}
