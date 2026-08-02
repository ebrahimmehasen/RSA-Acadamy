import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBackupCode, verifyTotp } from "@/lib/auth/2fa";
import { logSecurityEvent } from "@/lib/security/logs";
import { signMfaCookie, MFA_COOKIE_NAME, MFA_COOKIE_MAX_AGE } from "@/lib/auth/mfaSession";
import { checkAuthRateLimit } from "@/lib/rateLimit/upstash";

const schema = z.object({ token: z.string().min(6).max(20) });

/** Login-time TOTP/backup-code challenge — sets the mfa_verified cookie. */
export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    const { allowed } = await checkAuthRateLimit(`2fa:${session.profile.id}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "محاولات كتير — جرب تاني بعد دقيقة" },
        { status: 429 },
      );
    }

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

    let ok = false;
    if (/^\d{6}$/.test(token)) {
      ok = verifyTotp(record.secret, token);
    }

    if (!ok && token.length === 8) {
      const { data: codes } = await supabase
        .from("backup_codes")
        .select("id, code_hash")
        .eq("profile_id", session.profile.id)
        .is("used_at", null);
      for (const row of codes ?? []) {
        if (await verifyBackupCode(token, row.code_hash)) {
          ok = true;
          await supabase
            .from("backup_codes")
            .update({ used_at: new Date().toISOString() })
            .eq("id", row.id);
          await logSecurityEvent({
            profileId: session.profile.id,
            eventType: "backup_code_used",
          });
          break;
        }
      }
    }

    if (!ok) {
      await logSecurityEvent({
        profileId: session.profile.id,
        eventType: "2fa_verify_failed",
      });
      return NextResponse.json({ error: "الكود غلط" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
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
