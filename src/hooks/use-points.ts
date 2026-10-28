import { useSyncExternalStore } from "react";
import { pointsSummaryAction, type PointsSummary } from "@/lib/actions/rewards";
import { signedInHint } from "@/lib/auth/hint";

/**
 * The shopper's points balance and unscratched cards, one store for the account page, the Rewards tab and the
 * Rewards page. Read when a component first needs it and when the tab comes back into view; the Rewards page
 * sets it exactly after a redeem or a scratch.
 */

export type Points =
  /** Not read yet. */
  | { status: "loading" }
  /** A guest, or the programme is off. */
  | { status: "none" }
  | ({ status: "ready" } & PointsSummary);

const LOADING: Points = { status: "loading" };
const NONE: Points = { status: "none" };

const listeners = new Set<() => void>();
let state: Points = LOADING;
let reading = false;

function emit(next: Points) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Sets the numbers (the Rewards page knows them exactly after a redeem or a scratch). */
export function setPoints(next: PointsSummary) {
  emit({ status: "ready", ...next });
}

export function refreshPoints() {
  if (reading) return;
  if (!signedInHint()) return emit(NONE);
  reading = true;
  void pointsSummaryAction()
    .then((result) => {
      if (result.status === "ok") emit({ status: "ready", ...result.data });
      else if (result.status !== "error") emit(NONE);
      else if (state.status === "loading") emit(NONE);
    })
    .catch(() => state.status === "loading" && emit(NONE))
    .finally(() => {
      reading = false;
    });
}

function onVisible() {
  if (document.visibilityState === "visible") refreshPoints();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) document.addEventListener("visibilitychange", onVisible);
  // A different visitor may be here now (signed out, or in): never show the last one's numbers.
  if (!signedInHint()) {
    if (state.status !== "none") emit(NONE);
  } else if (state.status !== "ready") {
    refreshPoints();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) document.removeEventListener("visibilitychange", onVisible);
  };
}

export function usePoints(): Points {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}
