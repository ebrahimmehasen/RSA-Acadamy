import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Decision #22: notifications are kept 3 days only. */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const { error, count } = await supabase
    .from("notifications")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
