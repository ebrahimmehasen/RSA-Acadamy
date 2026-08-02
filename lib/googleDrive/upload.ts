import { Readable } from "node:stream";
import { drive } from "./client";
import { getOrCreateFolder } from "./folders";
import { getFileUrl } from "./files";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UploadResult {
  fileId: string;
  fileUrl: string;
}

/** Limits per upload kind (from TECHNICAL_DECISIONS.md #5, #11, #18, #30). */
export const UPLOAD_RULES = {
  profile: {
    maxBytes: 5 * 1024 * 1024,
    mimes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  },
  assignment: {
    maxBytes: 25 * 1024 * 1024,
    mimes: [
      "image/jpeg", "image/png", "image/gif",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip", "application/x-zip-compressed",
    ],
  },
  teacher_attachment: {
    maxBytes: 50 * 1024 * 1024,
    mimes: [
      "image/jpeg", "image/png", "image/gif",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip", "application/x-zip-compressed",
      "video/mp4",
    ],
  },
  payment: {
    maxBytes: 5 * 1024 * 1024,
    mimes: ["image/jpeg", "image/png", "application/pdf"],
  },
  session: {
    maxBytes: 1024 * 1024 * 1024, // 1GB
    mimes: ["video/mp4", "video/webm"],
  },
  quiz: {
    maxBytes: 25 * 1024 * 1024,
    mimes: [
      "image/jpeg", "image/png", "image/gif",
      "application/pdf", "application/zip", "application/x-zip-compressed",
    ],
  },
} as const;

export type UploadKind = keyof typeof UPLOAD_RULES;

export function validateUpload(
  kind: UploadKind,
  mimeType: string,
  sizeBytes: number,
): string | null {
  const rule = UPLOAD_RULES[kind];
  if (sizeBytes > rule.maxBytes) {
    return `الملف أكبر من الحد المسموح (${Math.round(rule.maxBytes / 1024 / 1024)}MB)`;
  }
  if (!(rule.mimes as readonly string[]).includes(mimeType)) {
    return "نوع الملف غير مسموح";
  }
  return null;
}

export async function uploadFileFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderPath: string,
): Promise<UploadResult> {
  const folderId = await getOrCreateFolder(folderPath);
  const { data } = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });
  if (!data.id) throw new Error("Drive upload failed");
  // NOTE: no public permission is granted — files are served through
  // the authenticated /api/files/[fileId] proxy.
  return { fileId: data.id, fileUrl: getFileUrl(data.id) };
}

async function registerFile(options: {
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  entityType: UploadKind | "other";
  entityId: string;
  uploadedBy: number | null;
}) {
  const supabase = createAdminClient();
  await supabase.from("file_storage").insert({
    drive_file_id: options.driveFileId,
    file_name: options.fileName,
    mime_type: options.mimeType,
    file_size: options.sizeBytes,
    entity_type: options.entityType,
    entity_id: options.entityId,
    uploaded_by: options.uploadedBy,
  });
}

interface CommonUploadOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  uploadedBy: number | null;
}

export async function uploadProfilePicture(
  options: CommonUploadOptions & {
    profileId: number;
    userType: "student" | "teacher" | "parent" | "admin";
  },
): Promise<UploadResult> {
  const subfolder = {
    student: "Students",
    teacher: "Teachers",
    parent: "Parents",
    admin: "Admin",
  }[options.userType];
  const ext = options.fileName.split(".").pop() ?? "jpg";
  const result = await uploadFileFromBuffer(
    options.buffer,
    `${options.profileId}_${Date.now()}.${ext}`,
    options.mimeType,
    `Profile_Pictures/${subfolder}`,
  );
  await registerFile({
    driveFileId: result.fileId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    sizeBytes: options.buffer.length,
    entityType: "profile",
    entityId: String(options.profileId),
    uploadedBy: options.uploadedBy,
  });
  return result;
}

export async function uploadAssignmentFile(
  options: CommonUploadOptions & { studentId: number; assignmentId: number },
): Promise<UploadResult> {
  const result = await uploadFileFromBuffer(
    options.buffer,
    `Assignment_${options.assignmentId}_${options.fileName}`,
    options.mimeType,
    `Assignment_Files/Student_Submissions/${options.studentId}`,
  );
  await registerFile({
    driveFileId: result.fileId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    sizeBytes: options.buffer.length,
    entityType: "assignment",
    entityId: String(options.assignmentId),
    uploadedBy: options.uploadedBy,
  });
  return result;
}

export async function uploadTeacherAttachment(
  options: CommonUploadOptions & { assignmentId: number },
): Promise<UploadResult> {
  const result = await uploadFileFromBuffer(
    options.buffer,
    `Attachment_${options.assignmentId}_${options.fileName}`,
    options.mimeType,
    "Assignment_Files/Teacher_Attachments",
  );
  await registerFile({
    driveFileId: result.fileId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    sizeBytes: options.buffer.length,
    entityType: "teacher_attachment",
    entityId: String(options.assignmentId),
    uploadedBy: options.uploadedBy,
  });
  return result;
}

export async function uploadPaymentProof(
  options: CommonUploadOptions & {
    paymentId: number;
    payerType: "student" | "teacher";
  },
): Promise<UploadResult> {
  const subfolder =
    options.payerType === "teacher"
      ? "Teacher_Salary_Proofs"
      : "Student_Payment_Proofs";
  const result = await uploadFileFromBuffer(
    options.buffer,
    `Payment_${options.paymentId}_${options.fileName}`,
    options.mimeType,
    `Payment_Proofs/${subfolder}`,
  );
  await registerFile({
    driveFileId: result.fileId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    sizeBytes: options.buffer.length,
    entityType: "payment",
    entityId: String(options.paymentId),
    uploadedBy: options.uploadedBy,
  });
  return result;
}

export async function uploadRecordedSession(
  options: CommonUploadOptions & { sessionId: number; subjectFolder: string },
): Promise<UploadResult> {
  const result = await uploadFileFromBuffer(
    options.buffer,
    `Session_${options.sessionId}_${options.fileName}`,
    options.mimeType,
    `Recorded_Sessions/${options.subjectFolder}`,
  );
  await registerFile({
    driveFileId: result.fileId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    sizeBytes: options.buffer.length,
    entityType: "session",
    entityId: String(options.sessionId),
    uploadedBy: options.uploadedBy,
  });
  return result;
}

export async function uploadQuizAttachment(
  options: CommonUploadOptions & { quizId: number },
): Promise<UploadResult> {
  const result = await uploadFileFromBuffer(
    options.buffer,
    `Quiz_${options.quizId}_${options.fileName}`,
    options.mimeType,
    "Quiz_Files/Quiz_Attachments",
  );
  await registerFile({
    driveFileId: result.fileId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    sizeBytes: options.buffer.length,
    entityType: "quiz",
    entityId: String(options.quizId),
    uploadedBy: options.uploadedBy,
  });
  return result;
}
