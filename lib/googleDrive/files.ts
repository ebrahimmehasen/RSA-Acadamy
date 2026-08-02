import { Readable } from "node:stream";
import { drive } from "./client";

export async function deleteFile(fileId: string): Promise<void> {
  await drive.files.delete({ fileId });
}

export async function listFilesInFolder(folderId: string) {
  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, size, createdTime)",
    pageSize: 100,
  });
  return data.files ?? [];
}

/**
 * App-internal URL that streams the file through our authenticated
 * proxy. Files stay PRIVATE on Drive (the docs' original design made
 * every upload public-by-link — deliberately not doing that).
 */
export function getFileUrl(driveFileId: string): string {
  return `/api/files/${driveFileId}`;
}

/** Streams a Drive file (used by the proxy route). */
export async function getFileStream(fileId: string): Promise<{
  stream: Readable;
  mimeType: string | undefined;
  size: string | undefined;
  name: string | undefined;
}> {
  const meta = await drive.files.get({
    fileId,
    fields: "mimeType, size, name",
  });
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" },
  );
  return {
    stream: res.data as Readable,
    mimeType: meta.data.mimeType ?? undefined,
    size: meta.data.size ?? undefined,
    name: meta.data.name ?? undefined,
  };
}
