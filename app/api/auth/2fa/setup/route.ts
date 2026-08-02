import { NextResponse } from "next/server";
import { requireAuth, toErrorResponse } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQrDataUrl, generateSecret } from "@/lib/auth/2fa";

/** Generates a new (not-yet-enabled) TOTP secret + QR code. */
export async function POST() {
  try {
    const session = await requireAuth();
    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("user_2fa")
      .select("is_enabled")
      .eq("profile_id", session.profile.id)
      .maybeSingle();
    if (existing?.is_enabled) {
      return NextResponse.json(
        { error: "2FA مفعّل بالفعل" },
        { status: 400 },
      );
    }

    const { data: user } = await supabase.auth.admin.getUserById(
      session.userId,
    );
    const email = user.user?.email ?? "user";

    const { base32, otpauthUrl } = generateSecret(email);
    const qr = await generateQrDataUrl(otpauthUrl);

    await supabase.from("user_2fa").upsert(
      { profile_id: session.profile.id, secret: base32, is_enabled: false },
      { onConflict: "profile_id" },
    );

    return NextResponse.json({ qr, secret: base32 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
