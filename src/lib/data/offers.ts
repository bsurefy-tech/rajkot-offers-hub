import { api, orUndefined } from "@/lib/api/client";
import { offerIdFromHandle, toOffer, toOfferSummary, TYPE_TO_API } from "@/lib/api/mappers";
import type { Page, PromotionCard, PromotionDetail } from "@/lib/api/types";
import type { Offer, OfferFilters, OfferPin, OfferSummary, Paged, SortKey, ValidityKey } from "@/types";
import { getBusiness } from "./businesses";
import { areaName } from "./categories";

export const PAGE_SIZE = 9;
const MAX_PER_PAGE = 100;

const SORTS: Record<SortKey, string> = { newest: "latest", ending: "ending_soon", discount: "biggest_discount", nearest: "nearest" };
const ENDS_WITHIN_DAYS: Record<ValidityKey, number> = { today: 0, week: 7, month: 30 };

type FeedQuery = Record<string, string | number | string[] | undefined>;

/**
 * One page of the API feed as cards, cached by its query. Cards are built inside
 * the cache: `daysLeft` reads today's date, which a prerender may only do there.
 */
async function feed(query: FeedQuery): Promise<{ items: OfferSummary[]; total: number }> {
  const page = await api<Page<PromotionCard>>("/promotions", { query });
  return { items: page.data.map(toOfferSummary), total: page.meta.total };
}

/** The site's filters as the API's query. Null when an area has no live offers (so nothing can match). */
async function feedQuery(filters: OfferFilters): Promise<FeedQuery | null> {
  const areas = filters.areas?.length ? await Promise.all(filters.areas.map(areaName)) : [];
  if (areas.some((name) => !name)) return null;
  return {
    q: filters.q,
    category: filters.subcategory || filters.category,
    areas: areas.length ? (areas as string[]) : undefined,
    type: filters.type ? TYPE_TO_API[filters.type] : undefined,
    ends_within_days: filters.validity ? ENDS_WITHIN_DAYS[filters.validity] : undefined,
    // "Nearest" needs a location; without one it falls back to the newest.
    sort: SORTS[filters.sort === "nearest" && !filters.near ? "newest" : (filters.sort ?? "newest")],
    // With a location every list also gets each card's distance.
    lat: filters.near?.lat,
    lng: filters.near?.lng,
  };
}

export async function getOffers(filters: OfferFilters = {}): Promise<Paged<OfferSummary>> {
  const page = Math.max(1, filters.page ?? 1);
  const query = await feedQuery(filters);
  if (!query) return { items: [], total: 0, page, hasMore: false };
  // "Load more" shows every page up to the requested one. Each page is its own cached request,
  // so the list can grow past what one request may return (the API caps `per_page` at 100).
  const first = await feed({ ...query, per_page: PAGE_SIZE, page: 1 });
  // A page number beyond the last one only shows what exists.
  const last = Math.min(page, Math.ceil(first.total / PAGE_SIZE));
  const rest = await Promise.all(Array.from({ length: Math.max(0, last - 1) }, (_, i) => feed({ ...query, per_page: PAGE_SIZE, page: i + 2 })));
  const items = [first, ...rest].flatMap((p) => p.items);
  return { items, total: first.total, page, hasMore: items.length < first.total };
}

/** Exactly one page of a list, for "load more as you scroll" (`getOffers` returns every page up to one). */
export async function getOffersPage(filters: OfferFilters, page: number): Promise<{ items: OfferSummary[]; hasMore: boolean }> {
  const query = await feedQuery(filters);
  if (!query) return { items: [], hasMore: false };
  const result = await feed({ ...query, per_page: PAGE_SIZE, page });
  return { items: result.items, hasMore: page * PAGE_SIZE < result.total };
}

const PIN_OFFERS = 100;
/** Shops looked up at once when placing pins. */
const PIN_BATCH = 10;

/**
 * The offers of a list placed on the map: one pin per shop, at its main outlet, listing that
 * shop's offers. Cards carry no coordinates, so each shop's profile is read for its outlets.
 * Covers the first {@link PIN_OFFERS} offers; `total` is how many match.
 */
export async function getOfferPins(filters: OfferFilters): Promise<{ pins: OfferPin[]; total: number }> {
  const query = await feedQuery(filters);
  if (!query) return { pins: [], total: 0 };
  const { items, total } = await feed({ ...query, per_page: PIN_OFFERS, page: 1 });

  const byShop = new Map<string, OfferSummary[]>();
  for (const offer of items) byShop.set(offer.businessSlug, [...(byShop.get(offer.businessSlug) ?? []), offer]);

  const slugs = [...byShop.keys()];
  const pins: OfferPin[] = [];
  for (let i = 0; i < slugs.length; i += PIN_BATCH) {
    const shops = await Promise.all(slugs.slice(i, i + PIN_BATCH).map((slug) => getBusiness(slug).catch(() => undefined)));
    shops.forEach((shop, j) => {
      const offers = byShop.get(slugs[i + j])!;
      const outlet = shop?.outlets.find((o) => o.isMain && o.geo) ?? shop?.outlets.find((o) => o.geo);
      if (!shop || !outlet?.geo) return;
      pins.push({
        businessSlug: shop.slug,
        businessName: shop.name,
        areaName: outlet.areaName || offers[0].areaName,
        lat: outlet.geo.lat,
        lng: outlet.geo.lng,
        ...(offers[0].distanceKm !== undefined ? { distanceKm: offers[0].distanceKm } : {}),
        offers: offers.map((o) => ({ urlSlug: o.urlSlug, title: o.title, badge: o.badge, image: o.images[0], imageIsLogo: o.imageIsLogo })),
      });
    });
  }
  return { pins, total };
}

async function promotion(id: string): Promise<PromotionDetail | undefined> {
  return (await orUndefined(api<{ data: PromotionDetail }>(`/promotions/${id}`)))?.data;
}

async function offerById(id: string): Promise<Offer | undefined> {
  const detail = await promotion(id);
  if (!detail) return undefined;
  return toOffer(detail, await getBusiness(detail.business.slug));
}

export async function getOfferCard(id: string): Promise<OfferSummary | undefined> {
  const detail = await promotion(id);
  return detail && toOfferSummary(detail);
}

/** One offer by its handle ("<slug>-<id>"), live or past. */
export async function getOffer(handle: string): Promise<Offer | undefined> {
  const id = offerIdFromHandle(handle);
  return id ? offerById(id) : undefined;
}

/** Live offers in the same category first, then the rest. */
export async function getSimilarOffers(offer: Offer, limit = 4): Promise<OfferSummary[]> {
  const [same, rest] = await Promise.all([
    offer.categorySlug ? feed({ category: offer.categorySlug, per_page: limit + 1 }) : Promise.resolve({ items: [] as OfferSummary[] }),
    feed({ sort: "recommended", per_page: limit + 1 }),
  ]);
  const seen = new Set([offer.id]);
  const picks: OfferSummary[] = [];
  for (const card of [...same.items, ...rest.items]) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    picks.push(card);
  }
  return picks.slice(0, limit);
}

/** Offers ending soonest; shown as "today's offers" on the home page. */
export async function getTodayOffers(limit = 6): Promise<OfferSummary[]> {
  return (await feed({ sort: "ending_soon", per_page: limit })).items;
}

export async function getLatestOffers(limit = 6): Promise<OfferSummary[]> {
  const today = new Set((await getTodayOffers()).map((o) => o.id));
  const { items } = await feed({ sort: "latest", per_page: limit * 2 });
  return items.filter((card) => !today.has(card.id)).slice(0, limit);
}

/** A shop's live offers and its past ones. */
export async function getBusinessOffers(businessSlug: string) {
  const [active, expired] = await Promise.all([
    feed({ business: businessSlug, sort: "latest", per_page: 50 }),
    feed({ business: businessSlug, lifecycle: "ended", per_page: 24 }),
  ]);
  return { active: active.items, expired: expired.items };
}

/** Cards for the given handles (e.g. saved offers), in that order; unknown or unpublished ones are skipped. */
export async function getOffersByHandles(handles: string[]): Promise<OfferSummary[]> {
  const ids = handles.map(offerIdFromHandle).filter((id): id is string => Boolean(id)).slice(0, 60);
  const cards = await Promise.all(ids.map(getOfferCard));
  return cards.filter((card): card is OfferSummary => Boolean(card));
}

/** Every live offer's handle, for static params and the sitemap. */
export async function getLiveOffers(): Promise<OfferSummary[]> {
  const offers: OfferSummary[] = [];
  for (let page = 1; page <= 50; page++) {
    const result = await api<Page<PromotionCard>>("/promotions", { query: { per_page: MAX_PER_PAGE, page, sort: "latest" } });
    offers.push(...result.data.map(toOfferSummary));
    if (page >= result.meta.last_page) break;
  }
  return offers;
}

export async function getOfferSlugs() {
  return (await getLiveOffers()).map((o) => o.slug);
}

/** Offers the platform highlights (the featured strip), live ones only. */
export async function getFeaturedOffers(limit = 8): Promise<OfferSummary[]> {
  const page = await api<{ data: PromotionCard[] }>("/promotions/featured", { query: { per_page: limit } });
  return page.data.slice(0, limit).map(toOfferSummary);
}
