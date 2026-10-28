"use server";

import { api, ApiError } from "@/lib/api/client";
import { deviceHeaders } from "@/lib/api/device";
import { accessToken, withSession } from "@/lib/auth/session";
import { getReelFeed } from "@/lib/zalak/data";
import type { ZalakStory } from "@/lib/zalak/types";

export interface MoreReels {
  stories: ZalakStory[];
  token?: string;
  hasMore: boolean;
}

/** The next page of reels, for the infinite scroll. A failure ends the feed quietly. */
export async function moreReelsAction(page: number, token?: string): Promise<MoreReels> {
  if (!Number.isInteger(page) || page < 2 || page > 200 || (token !== undefined && (typeof token !== "string" || token.length > 200))) return { stories: [], hasMore: false };
  try {
    return await getReelFeed(page, 12, token);
  } catch {
    return { stories: [], hasMore: false };
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tells the API which statuses or reels were actually on screen, so a ring goes grey and a reel is not served again. Never throws: a missed report is only a missed grey ring. */
export async function reportSeenAction(type: "status" | "reel", ids: string[]): Promise<void> {
  if ((type !== "status" && type !== "reel") || !Array.isArray(ids)) return;
  const clean = [...new Set(ids.filter((id) => typeof id === "string" && UUID.test(id)))].slice(0, 50);
  if (clean.length === 0) return;
  try {
    await api("/feed-views", { method: "POST", body: { type, ids: clean }, token: await accessToken(), headers: await deviceHeaders(), client: null });
  } catch (error) {
    // 422 is a guest with no device key yet, 404 a platform with the feature off: nothing to report either way.
    if (!(error instanceof ApiError) || error.status >= 500) console.error("[feed-views]", error);
  }
}

/** Likes or saves (or takes back) a status or a reel; a status can only be liked. "signed-out" means the visitor has to log in first. */
export async function setReactionAction(kind: "status" | "reel", id: string, reaction: "like" | "save", on: boolean): Promise<"ok" | "signed-out" | "error"> {
  if ((kind !== "status" && kind !== "reel") || (reaction !== "like" && reaction !== "save") || (kind === "status" && reaction === "save") || typeof id !== "string" || !UUID.test(id)) return "error";
  const path = `/${kind === "status" ? "statuses" : "reels"}/${id}/${reaction}`;
  try {
    const result = await withSession((token) => api(path, { method: on ? "POST" : "DELETE", token, client: null }));
    return result === "signed-out" ? "signed-out" : "ok";
  } catch (error) {
    // Taking back something that has since gone is already what was asked for.
    if (!on && error instanceof ApiError && error.status === 404) return "ok";
    console.error("[reaction]", error);
    return "error";
  }
}

/** Counts what a viewer did with a reel (watched it, finished it, shared it, tapped its link). The API counts each once per viewer a day. Never throws. */
export async function reelEventAction(id: string, type: "view" | "complete" | "share" | "link_tap"): Promise<void> {
  if (typeof id !== "string" || !UUID.test(id) || !["view", "complete", "share", "link_tap"].includes(type)) return;
  try {
    await api(`/reels/${id}/events`, { method: "POST", body: { type }, headers: await deviceHeaders(), token: await accessToken(), client: null });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status >= 500) console.error("[reel-event]", error);
  }
}

export type ReportReason = "inappropriate" | "misleading" | "spam" | "copyright" | "other";
const REASONS: ReportReason[] = ["inappropriate", "misleading", "spam", "copyright", "other"];

/** Reports a status or reel. "own" is the poster's own shop, "gone" a post that is no longer showing, "limit" too many reports for now. */
export async function reportContentAction(kind: "status" | "reel", id: string, reason: ReportReason, note?: string): Promise<"ok" | "signed-out" | "own" | "gone" | "limit" | "error"> {
  if ((kind !== "status" && kind !== "reel") || typeof id !== "string" || !UUID.test(id) || !REASONS.includes(reason)) return "error";
  const text = typeof note === "string" ? note.trim().slice(0, 1000) : "";
  const path = `/${kind === "status" ? "statuses" : "reels"}/${id}/reports`;
  try {
    const result = await withSession((token) => api(path, { method: "POST", body: { reason, ...(text ? { note: text } : {}) }, token, client: null }));
    return result === "signed-out" ? "signed-out" : "ok";
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return "gone";
      if (error.status === 422) return "own";
      if (error.status === 429) return "limit";
    }
    console.error("[report]", error);
    return "error";
  }
}
