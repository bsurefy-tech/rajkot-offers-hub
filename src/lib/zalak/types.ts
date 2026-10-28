/** A clip is 5 to 15 seconds: a short video, or a photo shown for that long. */
export const CLIP_MIN_SECONDS = 5;
export const CLIP_MAX_SECONDS = 15;

/** Zalak is the feed of reels; a status is a shop's post that disappears after 24 hours. Both play in the same viewer. */
export type ZalakKind = "reel" | "status";

/** Where a post's button goes: the offer it is about, or the shop. */
export interface ZalakLink {
  href: string;
  kind: "offer" | "shop";
}

export interface ZalakClip {
  /** The API's id for this post, for liking and "seen". Missing on the sample posts. */
  id?: string;
  kind: "image" | "video";
  /** What this post says, when each post has its own text (a status does). */
  caption?: string;
  link?: ZalakLink;
  liked?: boolean;
  likes?: number;
  /** The viewer saved this reel. */
  saved?: boolean;
  /** The viewer has already watched it. */
  seen?: boolean;
  /** ISO time this post went up, when each post has its own. */
  postedAt?: string;
  /** The photo, or the video file. */
  src: string;
  /** A still shown before a video plays. */
  poster?: string;
  /** How long it plays, between CLIP_MIN_SECONDS and CLIP_MAX_SECONDS. */
  seconds: number;
}

export interface ZalakShop {
  slug: string;
  name: string;
  logo?: string;
  areaName?: string;
  /** The platform's own posts, not a shop's: no shop page, nothing to follow. */
  platform?: boolean;
}

/** One reel, or one shop's status: a shop, a short caption and one or more clips (the "angles"). */
export interface ZalakStory {
  id: string;
  kind: ZalakKind;
  shop: ZalakShop;
  title: string;
  caption?: string;
  /** Posts come from the API (they can be liked and counted), not from the sample feed. */
  live?: boolean;
  /** Something in this ring the viewer has not watched yet. */
  unseen?: boolean;
  /** The offer the "View offer" button opens, when the post is about one. */
  offer?: { slug: string; urlSlug: string; businessSlug: string };
  /** Km from the visitor to the shop's nearest outlet, when they have shared a location. */
  distanceKm?: number;
  /** ISO time it was posted. */
  postedAt: string;
  /** ISO time a status disappears. */
  expiresAt?: string;
  clips: ZalakClip[];
}

export function totalSeconds(story: Pick<ZalakStory, "clips">) {
  return story.clips.reduce((sum, clip) => sum + clip.seconds, 0);
}
