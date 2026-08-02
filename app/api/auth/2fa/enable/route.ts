import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateBackupCodes,
  hashBackupCode,
  verifyTotp,
} from "@/lib/auth/2fa";
import { logSecurityEvent } from "@/lib/security/logs";
import { signMfaCookie, MFA_COOKIE_NAME, MFA_COOKIE_MAX_AGE } from "@/lib/auth/mfaSession";

const schema = z.object({ token: z.string().length(6) });

/** Confirms the setup token and turns on 2FA, issuing backup codes. */
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
    if (!record) {
      return NextResponse.json({ error: "ابدأ الإعداد الأول" }, { status: 400 });
    }
    if (record.is_enabled) {
      return NextResponse.json({ error: "2FA مفعّل بالفعل" }, { status: 400 });
    }

    if (!verifyTotp(record.secret, token)) {
      await logSecurityEvent({
        profileId: session.profile.id,
        eventType: "2fa_verify_failed",
      });
      return NextResponse.json({ error: "الكود غلط" }, { status: 400 });
    }

    await supabase
      .from("user_2fa")
      .update({ is_enabled: true, enabled_at: new Date().toISOString() })
      .eq("profile_id", session.profile.id);

    const codes = generateBackupCodes();
    const rows = await Promise.all(
      codes.map(async (code) => ({
        profile_id: session.profile.id,
        code_hash: await hashBackupCode(code),
      })),
    );
    await supabase.from("backup_codes").insert(rows);

    await logSecurityEvent({
      profileId: session.profile.id,
      eventType: "2fa_enabled",
    });

    const response = NextResponse.json({ backupCodes: codes });
    response.cookies.set(MFA_COOKIE_NAME, signMfaCookie(session.userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: MFA_COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
