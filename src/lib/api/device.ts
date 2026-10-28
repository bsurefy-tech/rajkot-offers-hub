import { cookies } from "next/headers";

/**
 * A random key for a visitor who is not signed in, so the API can remember which statuses and reels they have
 * already seen (it asks for it as `X-Device-Key`). The proxy hands one out on a first visit; it identifies a
 * browser, not a person, and the server is the only one who reads it.
 */
export const DEVICE_COOKIE = "ro_dk";

const YEAR = 365 * 24 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function deviceCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: YEAR };
}

/** The visitor's device key header, or nothing when they have none yet (the API then reads everything as unseen). */
export async function deviceHeaders(): Promise<Record<string, string>> {
  const key = (await cookies()).get(DEVICE_COOKIE)?.value;
  return key && UUID.test(key) ? { "X-Device-Key": key } : {};
}
