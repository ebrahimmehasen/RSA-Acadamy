import { drive, ROOT_FOLDER_ID } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";

/** The canonical folder tree (from GOOGLE_DRIVE_INTEGRATION.md). */
export const FOLDER_TREE = [
  "Profile_Pictures/Students",
  "Profile_Pictures/Teachers",
  "Profile_Pictures/Parents",
  "Profile_Pictures/Admin",
  "Assignment_Files/Student_Submissions",
  "Assignment_Files/Teacher_Attachments",
  "Payment_Proofs/Student_Payment_Proofs",
  "Payment_Proofs/Teacher_Salary_Proofs",
  "Recorded_Sessions",
  "Quiz_Files/Quiz_Attachments",
  "Announcements",
  "Teacher_CVs",
  "System_Backups/Database_Backups",
] as const;

const memoryCache = new Map<string, string>();

async function findOrCreateChild(
  name: string,
  parentId: string,
): Promise<string> {
  const { data } = await drive.files.list({
    q: `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const existing = data.files?.[0]?.id;
  if (existing) return existing;

  const { data: created } = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  if (!created.id) throw new Error(`failed to create Drive folder ${name}`);
  return created.id;
}

/**
 * Resolves a logical path like "Profile_Pictures/Students" to a Drive
 * folder ID, creating missing folders. Caches in memory + drive_folders.
 */
export async function getOrCreateFolder(folderPath: string): Promise<string> {
  const cached = memoryCache.get(folderPath);
  if (cached) return cached;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("drive_folders")
    .select("drive_id")
    .eq("path", folderPath)
    .maybeSingle();
  if (row?.drive_id) {
    memoryCache.set(folderPath, row.drive_id);
    return row.drive_id;
  }

  let parentId = ROOT_FOLDER_ID;
  const segments = folderPath.split("/").filter(Boolean);
  let walked = "";
  for (const segment of segments) {
    walked = walked ? `${walked}/${segment}` : segment;
    const walkedCached = memoryCache.get(walked);
    if (walkedCached) {
      parentId = walkedCached;
      continue;
    }
    parentId = await findOrCreateChild(segment, parentId);
    memoryCache.set(walked, parentId);
    await supabase
      .from("drive_folders")
      .upsert({ path: walked, drive_id: parentId }, { onConflict: "path" });
  }
  return parentId;
}

/** Creates the whole canonical tree (idempotent). */
export async function initializeFolderStructure(): Promise<
  Record<string, string>
> {
  const result: Record<string, string> = {};
  for (const folderPath of FOLDER_TREE) {
    result[folderPath] = await getOrCreateFolder(folderPath);
  }
  return result;
}
