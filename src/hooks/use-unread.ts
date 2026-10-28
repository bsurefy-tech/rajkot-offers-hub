import { useSyncExternalStore } from "react";
import { signedInHint } from "@/lib/auth/hint";
import { unreadCountAction } from "@/lib/actions/notifications";

/**
 * How many notifications the visitor has not read, one store for the header bell and the notifications page.
 * Read from the account when the page opens, when the tab comes back into view, and once a minute.
 */

const REFRESH_MS = 60_000;

const listeners = new Set<() => void>();
let count = 0;
let timer: ReturnType<typeof setInterval> | undefined;

function emit(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((listener) => listener());
}

/** Sets the count (the notifications page knows it exactly after loading or marking read). */
export function setUnread(next: number) {
  emit(Math.max(0, next));
}

function refresh() {
  if (document.visibilityState === "hidden") return;
  if (!signedInHint()) return emit(0);
  void unreadCountAction().then(emit);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    }
  };
}

export function useUnread() {
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
