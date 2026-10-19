import { api, orUndefined } from "@/lib/api/client";
import { toBusiness, toBusinessSummary } from "@/lib/api/mappers";
import type { BusinessCard, BusinessResource, Page } from "@/lib/api/types";
import { toIsoDay } from "@/lib/format";
import type { Business, BusinessFilters, BusinessSortKey, BusinessSummary, Paged } from "@/types";
import { areaName } from "./categories";

export const BUSINESS_PAGE_SIZE = 10;

const SORTS: Record<BusinessSortKey, string> = { recommended: "recommended", rating: "top_rated", nearest: "nearest" };

async function businessFeed(query: Record<string, string | number | undefined>) {
  const page = await api<Page<BusinessCard>>("/businesses", { query });
  return { items: page.data.map(toBusinessSummary), total: page.meta.total };
}

/** The site's filters as the API's query. Null when the area is unknown (so nothing can match). */
async function businessQuery(filters: BusinessFilters) {
  const area = filters.area ? await areaName(filters.area) : undefined;
  if (filters.area && !area) return null;
  // "Nearest" needs a location; without one the list stays in its default order.
  const sort = filters.sort === "nearest" && !filters.near ? "recommended" : (filters.sort ?? "recommended");
  return {
    q: filters.q,
    category: filters.category,
    area,
    sort: SORTS[sort],
    lat: filters.near?.lat,
    lng: filters.near?.lng,
  };
}

/** The shops of a list: every page up to the requested one, so a link without JavaScript can show more. */
export async function getBusinesses(filters: BusinessFilters = {}): Promise<Paged<BusinessSummary>> {
  const page = Math.max(1, filters.page ?? 1);
  const query = await businessQuery(filters);
  if (!query) return { items: [], total: 0, page, hasMore: false };
  const first = await businessFeed({ ...query, per_page: BUSINESS_PAGE_SIZE, page: 1 });
  const last = Math.min(page, Math.ceil(first.total / BUSINESS_PAGE_SIZE));
  const rest = await Promise.all(Array.from({ length: Math.max(0, last - 1) }, (_, i) => businessFeed({ ...query, per_page: BUSINESS_PAGE_SIZE, page: i + 2 })));
  const items = [first, ...rest].flatMap((p) => p.items);
  return { items, total: first.total, page, hasMore: items.length < first.total };
}

/** Exactly one page of a list, for loading more as the visitor scrolls. */
export async function getBusinessesPage(filters: BusinessFilters, page: number): Promise<{ items: BusinessSummary[]; hasMore: boolean }> {
  const query = await businessQuery(filters);
  if (!query) return { items: [], hasMore: false };
  const result = await businessFeed({ ...query, per_page: BUSINESS_PAGE_SIZE, page });
  return { items: result.items, hasMore: page * BUSINESS_PAGE_SIZE < result.total };
}

/** A shop's public profile. Phone and WhatsApp come back masked for guests. */
export async function getBusiness(slug: string): Promise<Business | undefined> {
  const resource = await orUndefined(api<{ data: BusinessResource }>(`/businesses/${encodeURIComponent(slug)}`));
  return resource && toBusiness(resource.data);
}

/** Every listed shop's slug and when its profile last changed, for static params and the sitemap. */
export async function getBusinessIndex(): Promise<{ slug: string; updatedAt?: string }[]> {
  const shops: { slug: string; updatedAt?: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const result = await api<Page<{ slug: string; updated_at?: string }>>("/businesses", { query: { per_page: 100, page } });
    shops.push(...result.data.map((b) => ({ slug: b.slug, updatedAt: b.updated_at ? toIsoDay(new Date(b.updated_at)) : undefined })));
    if (page >= result.meta.last_page) break;
  }
  return shops;
}
