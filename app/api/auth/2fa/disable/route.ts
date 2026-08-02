import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTotp } from "@/lib/auth/2fa";
import { logSecurityEvent } from "@/lib/security/logs";
import { MFA_COOKIE_NAME } from "@/lib/auth/mfaSession";

const schema = z.object({ token: z.string().length(6) });

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { token } = schema.parse(await request.json());

    const supabase = createAdminClient();
    const { data: record } = await supabase
      .from("user_2fa")
      .select("secret, is_enabled")
      .eq("profile_id", session.profile.id)
      .maybeSingle();
    if (!record?.is_enabled) {
      return NextResponse.json({ error: "2FA مش مفعّل" }, { status: 400 });
    }
    if (!verifyTotp(record.secret, token)) {
      return NextResponse.json({ error: "الكود غلط" }, { status: 400 });
    }

    await supabase.from("user_2fa").delete().eq("profile_id", session.profile.id);
    await supabase.from("backup_codes").delete().eq("profile_id", session.profile.id);

    await logSecurityEvent({
      profileId: session.profile.id,
      eventType: "2fa_disabled",
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(MFA_COOKIE_NAME);
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
