import { uploadFile } from "@/lib/submissionUploader";
import type { FileKind } from "./fileKinds";

export interface FileFieldSpec {
  /** the <input type="file"> name */
  name: string;
  kind: FileKind;
  /** form field the server action reads the ticket(s) from */
  ticketName: string;
}

/**
 * Uploads every file in the given fields straight to Drive and swaps each
 * one for its ticket, so the server action never receives file bytes
 * (which would travel through Vercel). Use in a form's onSubmit, then pass
 * the returned FormData to the action.
 */
export async function replaceFilesWithTickets(
  formData: FormData,
  fields: FileFieldSpec[],
  onFile?: (fileName: string) => void,
): Promise<FormData> {
  for (const field of fields) {
    const files = formData
      .getAll(field.name)
      .filter((f): f is File => f instanceof File && f.size > 0);
    formData.delete(field.name);
    for (const file of files) {
      onFile?.(file.name);
      const { ticket } = await uploadFile(field.kind, file);
      formData.append(field.ticketName, ticket);
    }
  }
  return formData;
}
