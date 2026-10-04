"use client";

import { useState, useTransition, type FormEvent } from "react";
import { replaceFilesWithTickets, type FileFieldSpec } from "./client";

/**
 * Drop-in onSubmit for a form that has file inputs: uploads the files
 * straight to Drive, swaps them for tickets, then runs the server action
 * with the ticketed FormData. Usage:
 *
 *   const upload = useTicketedSubmit(formAction, [
 *     { name: "cv", kind: "teacher_cv", ticketName: "cv_ticket" },
 *   ]);
 *   <form onSubmit={upload.onSubmit}> … {upload.uploading && …}
 */
export function useTicketedSubmit(
  action: (formData: FormData) => unknown,
  fields: FileFieldSpec[],
  opts: { resetOnSuccess?: boolean } = {},
) {
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploading || isPending) return;
    const form = e.currentTarget;
    setUploadError(null);
    setUploading(true);
    let formData: FormData;
    try {
      formData = await replaceFilesWithTickets(new FormData(form), fields, setCurrentFile);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "فشل رفع الملف");
      return;
    } finally {
      setUploading(false);
      setCurrentFile(null);
    }
    startTransition(async () => {
      await action(formData);
      if (opts.resetOnSuccess) form.reset();
    });
  }

  return { onSubmit, uploading, currentFile, uploadError, isPending, busy: uploading || isPending };
}
