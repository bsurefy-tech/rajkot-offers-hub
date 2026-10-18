import { analyticsConfig } from "@/lib/analytics/config";

/**
 * The web session: the API's access token (15 minutes) and refresh token
 * (30 days) in httpOnly cookies, so client code never sees either.
 */
export const ACCESS_COOKIE = "ro_at";
export const REFRESH_COOKIE = "ro_rt";
/**
 * Readable by the page's scripts, unlike the tokens: only says "someone signed in here", so the page knows to ask
 * for the visitor's saved offers and shops instead of keeping them on the device. It holds nothing secret.
 */
export const SIGNED_IN_HINT_COOKIE = "ro_in";

/**
 * Readable by the page's scripts: the account's id, for analytics (OpenPanel) to tell one signed-in visitor from another.
 * Only set when analytics is on. An opaque id, not the mobile number or name.
 */
export const ANALYTICS_USER_COOKIE = "ro_uid";

const REFRESH_TTL = 30 * 24 * 60 * 60;

interface CookieWriter {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}

function options(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

export function setSessionCookies(jar: CookieWriter, tokens: { access_token: string; refresh_token?: string; expires_in?: number; user?: { id: string } }) {
  jar.set(ACCESS_COOKIE, tokens.access_token, options(tokens.expires_in ?? 900));
  if (tokens.refresh_token) {
    jar.set(REFRESH_COOKIE, tokens.refresh_token, options(REFRESH_TTL));
    jar.set(SIGNED_IN_HINT_COOKIE, "1", { ...options(REFRESH_TTL), httpOnly: false });
    if (tokens.user && analyticsConfig()) jar.set(ANALYTICS_USER_COOKIE, tokens.user.id, { ...options(REFRESH_TTL), httpOnly: false });
  }
}

export function clearSessionCookies(jar: CookieWriter) {
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  jar.delete(SIGNED_IN_HINT_COOKIE);
  jar.delete(ANALYTICS_USER_COOKIE);
}

/** Seconds until a JWT expires (0 when expired or unreadable). The API checks the signature; this only avoids a wasted call. */
export function secondsLeft(token: string | undefined) {
  if (!token) return 0;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()) as { exp?: number };
    return Math.max(0, (payload.exp ?? 0) - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}
