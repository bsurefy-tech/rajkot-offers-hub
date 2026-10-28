"use server";

import { api } from "@/lib/api/client";
import { toOfferSummary } from "@/lib/api/mappers";
import type { Page, PromotionCard } from "@/lib/api/types";
import { savedShopCards } from "@/lib/actions/saves";
import { withSession } from "@/lib/auth/session";
import type { OfferSummary } from "@/types";

const LIMIT = 12;

/**
 * The newest live offers of the shops the signed-in visitor follows; empty for a guest or when there are none.
 * `follows` are the shop slugs they follow: an API that does not know `followed` yet answers with the whole feed,
 * so the cards are narrowed to those shops here as well.
 */
export async function followedOffersAction(follows: string[]): Promise<OfferSummary[]> {
  if (!Array.isArray(follows) || !follows.length) return [];
  const slugs = new Set(follows.filter((slug) => typeof slug === "string"));
  try {
    const page = await withSession((token) =>
      api<Page<PromotionCard>>("/promotions", { query: { followed: true, sort: "latest", per_page: LIMIT }, token, client: null }),
    );
    return page === "signed-out" ? [] : page.data.filter((card) => slugs.has(card.business.slug)).map(toOfferSummary);
  } catch (error) {
    console.error("[followed-offers]", error);
    return [];
  }
}

export interface FollowedShop {
  slug: string;
  name: string;
  logo?: string;
  categoryName: string;
  areaName: string;
  /** Its live offers, newest first. */
  offers: OfferSummary[];
}

const SHOP_LIMIT = 60;

/**
 * The shops a visitor follows (in the order given, newest follow first), each with its live offers, for the
 * Following tab. A shop that is gone is skipped; a shop with no live offer is listed with none.
 */
export async function followedShopsAction(follows: string[]): Promise<FollowedShop[]> {
  if (!Array.isArray(follows) || !follows.length) return [];
  const slugs = follows.filter((slug): slug is string => typeof slug === "string").slice(0, SHOP_LIMIT);
  try {
    const [shops, feed] = await Promise.all([
      savedShopCards(slugs),
      withSession((token) => api<Page<PromotionCard>>("/promotions", { query: { followed: true, sort: "latest", per_page: 50 }, token, client: null })),
    ]);
    const offers = feed === "signed-out" ? [] : feed.data.map(toOfferSummary);
    return shops.map((shop) => ({ ...shop, offers: offers.filter((o) => o.businessSlug === shop.slug && !o.isExpired) }));
  } catch (error) {
    console.error("[followed-shops]", error);
    return [];
  }
}
