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
