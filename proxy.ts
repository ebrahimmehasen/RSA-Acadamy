import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { verifyMfaCookie, MFA_COOKIE_NAME } from "@/lib/auth/mfaSession";

const ROLE_PREFIXES = ["student", "parent", "teacher", "admin"] as const;
type Role = (typeof ROLE_PREFIXES)[number];

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-2fa"];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const roleInPath = ROLE_PREFIXES.find((role) =>
    pathname.startsWith(`/${role}`),
  );

  if (!user && !isPublicPath && roleInPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const role = profile?.role as Role | undefined;
    return NextResponse.redirect(
      new URL(role ? `/${role}/dashboard` : "/", request.url),
    );
  }

  if (user && roleInPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== roleInPath) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 2FA challenge gate — verified separately from the Supabase session
    // itself (see lib/auth/mfaSession.ts) since the confirmed decision
    // was to run a custom TOTP layer on top of Supabase Auth rather
    // than a parallel session-token scheme.
    const mfaCookie = request.cookies.get(MFA_COOKIE_NAME)?.value;
    if (!verifyMfaCookie(mfaCookie, user.id)) {
      const { data: twoFa } = await supabase
        .from("user_2fa")
        .select("is_enabled")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (twoFa?.is_enabled) {
        const verifyUrl = new URL("/verify-2fa", request.url);
        verifyUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(verifyUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
