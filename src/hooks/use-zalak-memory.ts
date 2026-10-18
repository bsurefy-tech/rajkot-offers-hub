import { useSyncExternalStore } from "react";
import { reelEventAction, reportSeenAction } from "@/lib/actions/zalak";
import { track } from "@/lib/analytics/client";

/**
 * What this browser remembers about Zalak: which statuses it has watched (the ring on the home page turns
 * grey), which reels it liked, and whether it has seen the swipe tour. Kept in localStorage, never sent anywhere.
 */

const SEEN_KEY = "zalak-seen";
const LIKED_KEY = "zalak-liked";
const TOUR_KEY = "zalak-tour";
const CHANGED = "zalak-memory";

function read(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the memory just does not stick.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}

function useKey(key: string, server = "") {
  return useSyncExternalStore(subscribe, () => read(key), () => server);
}

const split = (raw: string) => new Set(raw ? raw.split(",") : []);

/** What the local memory files a ring under: a ring with a newer post than the one watched lights up again. */
export function ringSeenKey(story: { id: string; postedAt: string; live?: boolean }) {
  return story.live ? `${story.id}@${story.postedAt}` : story.id;
}

/** Ids of the statuses that were watched. */
export function useSeenStatuses() {
  return split(useKey(SEEN_KEY));
}

export function markStatusSeen(id: string) {
  const seen = split(read(SEEN_KEY));
  if (seen.has(id)) return;
  seen.add(id);
  write(SEEN_KEY, [...seen].slice(-100).join(","));
}

const reported = new Set<string>();

/** Tells the API a status or reel was on screen. Once per post per page visit; the API remembers it for the viewer. */
export function reportSeen(type: "status" | "reel", id: string | undefined) {
  if (!id || reported.has(id)) return;
  reported.add(id);
  if (type === "status") track("status_view", {});
  void reportSeenAction(type, [id]);
}

const counted = new Set<string>();

/** Counts what the viewer did with a reel: once per reel per page visit for watching and finishing (the API also limits it to once a day). */
export function reportReelEvent(id: string | undefined, type: "view" | "complete" | "share" | "link_tap") {
  if (!id) return;
  if (type === "view" || type === "complete") {
    const key = `${type}:${id}`;
    if (counted.has(key)) return;
    counted.add(key);
  }
  track(`reel_${type}`, {});
  void reelEventAction(id, type);
}

export function useLikedStories() {
  const liked = split(useKey(LIKED_KEY));
  return {
    isLiked: (id: string) => liked.has(id),
    toggle(id: string) {
      const next = split(read(LIKED_KEY));
      if (!next.delete(id)) next.add(id);
      write(LIKED_KEY, [...next].join(","));
    },
  };
}

/** True until the tour for this viewer (reels or statuses) was shown once on this device. The server never shows it, so a returning visitor sees no flash. */
export function useTourPending(kind: "reel" | "status") {
  return useKey(`${TOUR_KEY}-${kind}`, "done") !== "done";
}

export function markTourDone(kind: "reel" | "status") {
  write(`${TOUR_KEY}-${kind}`, "done");
  track("zalak_tour_done", { kind });
}
