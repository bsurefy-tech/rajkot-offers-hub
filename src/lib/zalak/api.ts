import { api, ApiError } from "@/lib/api/client";
import { deviceHeaders } from "@/lib/api/device";
import type { ContentLink, ReelCard, ReelPage, StatusPlay, StatusPost, StatusRing, StatusTray } from "@/lib/api/types";
import { accessToken } from "@/lib/auth/session";
import { offerPath, shopPath } from "@/lib/paths";
import { CLIP_MAX_SECONDS, CLIP_MIN_SECONDS, type ZalakClip, type ZalakLink, type ZalakShop, type ZalakStory } from "./types";

/**
 * Statuses and reels from the BSurefy API. Everything here is per viewer (which rings are lit, what is liked),
 * so it is never cached: the viewer is the account, or for a guest the device key the proxy handed out.
 * A platform that has not switched the feature on answers 404; that is "nothing to show", not an error.
 */

/** How long a photo status is shown, inside the 5–15 s a post is meant to last. */
const PHOTO_SECONDS = 7;
/** Rings fetched for the viewer, around the one that was opened. */
const RINGS_AHEAD = 10;
const RINGS_BEHIND = 2;

export const PLATFORM_RING = "platform";

/** The tray's `latest_at` is local time without a zone ("2026-10-17 14:54:09", India); the posts' own times are ISO. */
function isoTime(value: string) {
  return /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}+05:30`;
}

async function viewer() {
  return { token: await accessToken(), headers: await deviceHeaders(), fresh: true };
}

/** A 404 means the platform has the feature off. */
async function orOff<T>(request: Promise<T>, off: T): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return off;
    throw error;
  }
}

/** Where a post's button goes, or nothing when it does not point at anything the site can open. */
function linkFor(link: ContentLink | null, shopSlug: string | undefined): ZalakLink | undefined {
  if (!link) return undefined;
  if (link.type === "promotion" && link.slug) {
    // A platform post may point at any shop's offer; the older "/offers/<slug>-<id>" address finds it without the shop.
    const href = shopSlug ? offerPath({ businessSlug: shopSlug, urlSlug: link.slug }) : link.id ? `/offers/${link.slug}-${link.id}` : undefined;
    return href ? { href, kind: "offer" } : undefined;
  }
  return shopSlug ? { href: shopPath(shopSlug), kind: "shop" } : undefined;
}

function toClip(post: StatusPost, shopSlug: string | undefined): ZalakClip | undefined {
  const link = linkFor(post.link, shopSlug);
  const base = { id: post.id, caption: post.caption ?? undefined, link, liked: post.is_liked, likes: post.likes_count, seen: post.is_seen, postedAt: post.created_at };
  if (post.kind === "video" && post.video) {
    return { ...base, kind: "video", src: post.video.hls_url, poster: post.video.poster_url ?? undefined, seconds: Math.max(1, Math.ceil(post.video.duration_seconds)) };
  }
  if (post.image) return { ...base, kind: "image", src: post.image.url, seconds: Math.min(Math.max(PHOTO_SECONDS, CLIP_MIN_SECONDS), CLIP_MAX_SECONDS) };
  return undefined;
}

function ringStory(ring: StatusRing): ZalakStory {
  const { business } = ring;
  return {
    id: `status-${business.id}`,
    kind: "status",
    live: true,
    unseen: ring.has_unseen,
    shop: { slug: business.slug, name: business.name, logo: business.logo_thumb_url ?? business.logo_url ?? undefined },
    title: "",
    postedAt: isoTime(ring.latest_at),
    clips: [],
  };
}

function platformStory(platform: NonNullable<StatusTray["platform"]>): ZalakStory {
  return {
    id: `status-${PLATFORM_RING}`,
    kind: "status",
    live: true,
    unseen: platform.has_unseen,
    shop: { slug: PLATFORM_RING, name: platform.short_name || platform.name, platform: true },
    title: "",
    postedAt: isoTime(platform.latest_at),
    clips: [],
  };
}

/** The rings for the home page: the platform's own first, then the shops, with what the viewer has not watched leading. No clips yet. */
export async function getStatusRings(limit = 20): Promise<ZalakStory[]> {
  const tray = await orOff(api<StatusTray>("/status-tray", { query: { per_page: limit }, ...(await viewer()) }), undefined);
  if (!tray) return [];
  return [...(tray.platform ? [platformStory(tray.platform)] : []), ...tray.data.map(ringStory)];
}

/** One ring's posts, oldest first, ready to play. */
async function playRing(ring: ZalakStory): Promise<ZalakStory | undefined> {
  const platform = ring.shop.platform;
  const path = platform ? "/platform-statuses" : `/status-tray/${encodeURIComponent(ring.shop.slug)}`;
  const play = await orOff(api<StatusPlay>(path, await viewer()), undefined);
  const shopSlug = platform ? undefined : ring.shop.slug;
  const clips = (play?.data ?? []).map((post) => toClip(post, shopSlug)).filter((clip): clip is ZalakClip => Boolean(clip));
  if (clips.length === 0) return undefined;
  const first = clips.find((clip) => !clip.seen) ?? clips[0];
  return { ...ring, clips, unseen: clips.some((clip) => !clip.seen), title: first.caption ?? "", postedAt: ring.postedAt };
}

/** Whether a shop has a status up right now, and whether the viewer has watched all of it. For the shop page's logo ring; any failure just means no ring. */
export async function getShopStatus(slug: string): Promise<{ unseen: boolean } | undefined> {
  try {
    const play = await orOff(api<StatusPlay>(`/status-tray/${encodeURIComponent(slug)}`, await viewer()), undefined);
    const posts = play?.data ?? [];
    return posts.length ? { unseen: posts.some((post) => !post.is_seen) } : undefined;
  } catch {
    return undefined;
  }
}

/** The rings around the one that was opened, each with its posts, and where the opened one sits in the list. */
export async function getStatusStories(open?: { shop?: string; platform?: boolean }): Promise<{ stories: ZalakStory[]; start: number }> {
  const rings = await getStatusRings();
  const at = rings.findIndex((ring) => (open?.platform ? ring.shop.platform : open?.shop ? !ring.shop.platform && ring.shop.slug === open.shop : false));
  const from = Math.max(at - RINGS_BEHIND, 0);
  const window = rings.slice(from, from + RINGS_AHEAD);
  const played = (await Promise.all(window.map((ring) => playRing(ring).catch(() => undefined)))).filter((story): story is ZalakStory => Boolean(story));
  const start = at < 0 ? 0 : played.findIndex((story) => story.id === rings[at].id);
  return { stories: played, start: Math.max(start, 0) };
}

function reelStory(reel: ReelCard): ZalakStory {
  const { author } = reel;
  const shop: ZalakShop =
    author.type === "platform"
      ? { slug: PLATFORM_RING, name: author.short_name || author.name, platform: true }
      : { slug: author.slug, name: author.name, logo: author.logo_thumb_url ?? author.logo_url ?? undefined };
  const clip: ZalakClip = {
    id: reel.id,
    kind: "video",
    src: reel.video.hls_url,
    poster: reel.video.poster_url ?? undefined,
    seconds: Math.max(1, Math.ceil(reel.video.duration_seconds)),
    link: linkFor(reel.link, author.type === "business" ? author.slug : undefined),
    liked: reel.is_liked,
    likes: reel.likes_count,
    saved: reel.is_saved,
  };
  return { id: reel.id, kind: "reel", live: true, shop, title: reel.caption ?? "", postedAt: reel.published_at, clips: [clip] };
}

export interface ReelFeed {
  stories: ZalakStory[];
  /** Send it back with the next page so the order does not shift while reels are reported seen. */
  token?: string;
  hasMore: boolean;
}

/** One page of the reel feed, in the viewer's own order: unseen first, the shops they follow leading. */
export async function getReelPage(page = 1, perPage = 12, token?: string): Promise<ReelFeed> {
  const result = await orOff(api<ReelPage>("/reels", { query: { page, per_page: perPage, feed_token: token }, ...(await viewer()) }), undefined);
  if (!result) return { stories: [], hasMore: false };
  return { stories: result.data.map(reelStory), token: result.meta.feed_token, hasMore: result.meta.current_page < result.meta.last_page };
}

/** One reel by id, for a shared link or a card that is no longer on the first page. */
export async function getReel(id: string): Promise<ZalakStory | undefined> {
  const result = await orOff(api<{ data: ReelCard }>(`/reels/${encodeURIComponent(id)}`, await viewer()).catch((error) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 422)) return undefined;
    throw error;
  }), undefined);
  return result ? reelStory(result.data) : undefined;
}

/** Whether this platform has reels switched on: the chips answer 404 when it has not. A failure other than that keeps the screen. */
export async function reelsAvailable(): Promise<boolean> {
  try {
    await api("/reels/categories");
    return true;
  } catch (error) {
    return !(error instanceof ApiError && error.status === 404);
  }
}
