import { cookies } from "next/headers";
import { NEAR_COOKIE, parseNear, type Near } from "@/lib/location";

/** The visitor's "near me" location, if they set one. Reads a cookie, so only in dynamic parts of a page. */
export async function getNear(): Promise<Near | undefined> {
  return parseNear((await cookies()).get(NEAR_COOKIE)?.value);
}
