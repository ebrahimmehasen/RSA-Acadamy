import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { requireAuth, toErrorResponse } from "@/lib/auth/guards";
import { getFileStream } from "@/lib/googleDrive/files";

/**
 * Authenticated proxy for Google Drive files — files stay private on
 * Drive; any signed-in user streams them through here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    await requireAuth();
    const { fileId } = await params;

    if (!/^[\w-]+$/.test(fileId)) {
      return NextResponse.json({ error: "Bad file id" }, { status: 400 });
    }

    const file = await getFileStream(fileId);
    const webStream = Readable.toWeb(file.stream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": file.mimeType ?? "application/octet-stream",
        ...(file.size ? { "Content-Length": file.size } : {}),
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name ?? "file")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
