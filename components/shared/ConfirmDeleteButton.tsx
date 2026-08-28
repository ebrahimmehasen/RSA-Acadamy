"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

function DeleteSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button variant="destructive" size="xs" type="submit" disabled={pending}>
      {pending ? "جارٍ الحذف..." : label}
    </Button>
  );
}

export function ConfirmDeleteButton({
  action,
  hiddenFields,
  confirmMessage,
  label = "حذف",
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string | number>;
  confirmMessage: string;
  label?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <DeleteSubmitButton label={label} />
    </form>
  );
}
