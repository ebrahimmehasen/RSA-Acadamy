import type { UploadKind } from "@/lib/googleDrive/upload";
import type { Role } from "@/types/domain";

/**
 * Registry of the "simple" file uploads that go through the generic
 * /api/uploads/file route (browser → Drive directly, then a signed ticket
 * the feature's server action redeems). ADD NEW UPLOAD FEATURES HERE —
 * never read a File inside a server action (see CLAUDE.md, "Files").
 *
 * Uploads with their own bookkeeping (assignment answers/attachments,
 * recorded sessions) have dedicated routes under app/api/uploads/ but use
 * the very same protocol and client (lib/submissionUploader.ts).
 */
export interface FileKindSpec {
  /** size / mime rule (UPLOAD_RULES) and file_storage.entity_type */
  rule: UploadKind;
  /** Drive folder (under the root folder) */
  folder: (role: Role | null) => string;
  /** who may start this upload; "anonymous" also allows signed-out callers (signup) */
  roles: readonly Role[] | "anonymous";
}

const PROFILE_FOLDER: Record<Role, string> = {
  student: "Students",
  teacher: "Teachers",
  parent: "Parents",
  admin: "Admin",
};

export const FILE_KINDS = {
  profile_picture: {
    rule: "profile",
    folder: (role) => `Profile_Pictures/${role ? PROFILE_FOLDER[role] : "Signups"}`,
    roles: "anonymous",
  },
  teacher_cv: {
    rule: "teacher_cv",
    folder: () => "Teacher_CVs",
    roles: "anonymous",
  },
  announcement_attachment: {
    rule: "announcement",
    folder: () => "Announcements",
    roles: ["admin"],
  },
  quiz_attachment: {
    rule: "quiz",
    folder: () => "Quiz_Files/Quiz_Attachments",
    roles: ["teacher"],
  },
} as const satisfies Record<string, FileKindSpec>;

export type FileKind = keyof typeof FILE_KINDS;

export function isFileKind(value: unknown): value is FileKind {
  return typeof value === "string" && Object.hasOwn(FILE_KINDS, value);
}
