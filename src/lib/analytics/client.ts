import type {} from "@openpanel/nextjs";
import type { EventMap } from "./events";

/** Browser only. Does nothing when analytics is off (no `window.op`) or on the server, and never throws. */
export function track<E extends keyof EventMap>(name: E, properties: EventMap[E]) {
  if (typeof window === "undefined") return;
  try {
    window.op?.("track", name, properties);
  } catch {
    // Analytics must never break the page.
  }
}

/** Sets properties sent with every later event. */
export function setGlobalProperties(properties: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.op?.("setGlobalProperties", properties);
  } catch {
    // Analytics must never break the page.
  }
}
