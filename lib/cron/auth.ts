import { NextResponse } from "next/server";

/**
 * Vercel injects `Authorization: Bearer ${CRON_SECRET}` automatically
 * on Cron Job invocations once CRON_SECRET is set as a project env
 * var — this rejects any other caller (manual curl needs the same
 * header, which is also how these routes are tested locally).
 */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
