import type {} from "@openpanel/nextjs";
import type { EventMap } from "./events";

type Call = [method: string, ...args: unknown[]];

/** Calls made before the OpenPanel script has started (it loads after the page); sent in order once it has. */
const waiting: Call[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
const GIVE_UP_MS = 10_000;

function flush(startedAt: number) {
  if (typeof window.op === "function") {
    clearInterval(timer);
    timer = undefined;
    for (const call of waiting.splice(0)) window.op(...(call as Parameters<typeof window.op>));
  } else if (Date.now() - startedAt > GIVE_UP_MS) {
    clearInterval(timer);
    timer = undefined;
    waiting.length = 0;
  }
}

/**
 * Browser only, and never throws. Does nothing when analytics is off: the layout only renders the script's `#openpanel-init`
 * tag when it is on, so its absence means there is nothing to wait for.
 */
function send(...call: Call) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.op === "function") window.op(...(call as Parameters<typeof window.op>));
    else if (document.getElementById("openpanel-init")) {
      waiting.push(call);
      const startedAt = Date.now();
      timer ??= setInterval(() => flush(startedAt), 100);
    }
  } catch {
    // Analytics must never break the page.
  }
}

export function track<E extends keyof EventMap>(name: E, properties: EventMap[E]) {
  send("track", name, properties);
}

/** Sets properties sent with every later event; `undefined` clears one. */
export function setGlobalProperties(properties: Record<string, string | number | boolean | undefined>) {
  send("setGlobalProperties", properties);
}

/** Who is signed in, as the cookie set at login says (an opaque account id, nothing personal), if analytics is on. */
export const USER_COOKIE = "ro_uid";

function userId() {
  const entry = document.cookie.split("; ").find((cookie) => cookie.startsWith(`${USER_COOKIE}=`));
  return entry ? decodeURIComponent(entry.slice(USER_COOKIE.length + 1)) : undefined;
}

let identified = false;

/** The page was rendered for an account that is already known to OpenPanel (`profileId` went in with the script). */
export function noteIdentified() {
  identified = true;
}

/** Just logged in (no page load): tell OpenPanel who this is, so earlier and later events share one profile. */
export function identifyFromCookie() {
  if (typeof window === "undefined") return;
  const profileId = userId();
  if (!profileId) return;
  send("identify", { profileId });
  setGlobalProperties({ signed_in: true });
  identified = true;
}

/** The session is gone (logout, expiry, deletion): stop attributing events to the account. False when nobody was identified. */
export function clearIdentity() {
  if (!identified) return false;
  identified = false;
  send("clear");
  setGlobalProperties({ signed_in: false });
  return true;
}
