import { NextResponse } from "next/server";
import { getSession, type SessionInfo } from "@/lib/auth/session";
import type { Role } from "@/types/domain";

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Unauthorized" : "Forbidden");
  }
}

/** For API route handlers: returns the session or throws AuthError. */
export async function requireAuth(): Promise<SessionInfo> {
  const session = await getSession();
  if (!session) throw new AuthError(401);
  return session;
}

/** For API route handlers: returns the session or throws AuthError(403). */
export async function requireRole(...roles: Role[]): Promise<SessionInfo> {
  const session = await requireAuth();
  if (!roles.includes(session.profile.role)) throw new AuthError(403);
  return session;
}

/** Wrap an API handler body so AuthError becomes a proper JSON response. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
