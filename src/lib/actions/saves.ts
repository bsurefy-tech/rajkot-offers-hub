"use server";

import { api, ApiError } from "@/lib/api/client";
import { offerHandle, offerIdFromHandle } from "@/lib/api/mappers";
import type { Page, PromotionCard } from "@/lib/api/types";
import { withSession } from "@/lib/auth/session";
import { getBusiness, getOffersByHandles } from "@/lib/data";
import type { Business, OfferSummary } from "@/types";

/**
 * Saved offers and shops, and the shops a visitor follows. They live on the visitor's account (the API), so
 * saving or following needs a login. A save is a private bookmark; a follow asks for news of the shop's new offers.
 */

export type SaveKind = "offer" | "shop" | "follow";

/** The signed-in visitor's saves: offer handles ("<slug>-<id>"), shop slugs and followed shop slugs, newest first. */
export type SavesResult =
  | { status: "guest" }
  | { status: "error" }
  | { status: "member"; offers: string[]; shops: string[]; follows: string[] };

const MAX_CARDS = 60;
const SHOP_SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/i;

/** Every page of a saved list (a few hundred at most). */
async function listAll<T>(path: string, token: string, query: Record<string, string> = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 5; page++) {
    const result = await api<Page<T>>(path, { query: { ...query, per_page: 100, page }, token, client: null });
    items.push(...result.data);
    if (page >= result.meta.last_page) break;
  }
  return items;
}

/** The API's save URL for an offer (by handle), or the save/follow URL for a shop (by slug); those routes take the shop's id, not its slug. */
async function savePath(kind: SaveKind, key: string) {
  if (kind === "offer") {
    const id = offerIdFromHandle(key);
    return id ? `/promotions/${id}/save` : null;
  }
  if (!SHOP_SLUG.test(key)) return null;
  const business = await getBusiness(key).catch(() => undefined);
  return business ? `/businesses/${business.id}/${kind === "follow" ? "follow" : "save"}` : null;
}

/** The visitor's saves, or "guest" when nobody is signed in. */
export async function loadSavesAction(): Promise<SavesResult> {
  try {
    const result = await withSession(async (token) => {
      const [promotions, businesses, followed] = await Promise.all([
        listAll<PromotionCard>("/saved-promotions", token),
        listAll<{ slug: string }>("/saves", token),
        listAll<{ slug: string }>("/me/interactions", token, { filter: "follows" }),
      ]);
      return { offers: promotions.map(offerHandle), shops: businesses.map((b) => b.slug), follows: followed.map((b) => b.slug) };
    });
    return result === "signed-out" ? { status: "guest" } : { status: "member", ...result };
  } catch (error) {
    console.error("[saves]", error);
    return { status: "error" };
  }
}

/** Saves or unsaves one offer (by handle) or shop (by slug), or follows or unfollows a shop. "signed-out" means the session ended and the visitor has to log in again. */
export async function setSavedAction(kind: SaveKind, key: string, saved: boolean): Promise<"ok" | "signed-out" | "error"> {
  const path = typeof key === "string" ? await savePath(kind, key) : null;
  if (!path) return "error";
  try {
    const result = await withSession((token) => api(path, { method: saved ? "POST" : "DELETE", token, client: null }));
    return result === "signed-out" ? "signed-out" : "ok";
  } catch (error) {
    // Unsaving (or unfollowing) something that is no longer there is already what was asked for.
    if (!saved && error instanceof ApiError && error.status === 404) return "ok";
    console.error("[save]", error);
    return "error";
  }
}

export interface SavedShop {
  slug: string;
  name: string;
  logo?: string;
  categoryName: string;
  areaName: string;
}

function toSavedShop(business: Business): SavedShop {
  return { slug: business.slug, name: business.name, logo: business.logo, categoryName: business.categoryName, areaName: business.areaName };
}

/** Cards for the saved shops (by slug), in that order; ones that are gone are skipped. */
export async function savedShopCards(slugs: string[]): Promise<SavedShop[]> {
  const clean = slugs.filter((s) => typeof s === "string" && SHOP_SLUG.test(s)).slice(0, MAX_CARDS);
  const shops = await Promise.all(clean.map((slug) => getBusiness(slug).catch(() => undefined)));
  return shops.filter((shop): shop is Business => Boolean(shop)).map(toSavedShop);
}

/** Cards for the saved offers (by handle), in that order; ones that are gone are skipped. */
export async function savedOfferCards(handles: string[]): Promise<OfferSummary[]> {
  const clean = handles.filter((h) => typeof h === "string" && h.length <= 200).slice(0, MAX_CARDS);
  return clean.length ? getOffersByHandles(clean) : [];
}
