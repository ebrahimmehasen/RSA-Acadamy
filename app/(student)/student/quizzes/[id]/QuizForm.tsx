"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function QuizForm({
  action,
  quizId,
  children,
}: {
  action: (formData: FormData) => void;
  quizId: number;
  children: ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const submittingRef = useRef(false);

  // Warn before navigating away with unsaved answers.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (submittingRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  return (
    <form
      action={action}
      className="space-y-4"
      onChange={() => setDirty(true)}
      onSubmit={() => {
        submittingRef.current = true;
      }}
    >
      <input type="hidden" name="quiz_id" value={quizId} />
      {children}
    </form>
  );
}
