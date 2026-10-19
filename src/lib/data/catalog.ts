import { api, orUndefined } from "@/lib/api/client";
import type { Media, Page } from "@/lib/api/types";
import type { Rating } from "@/types";

/** A product or service from a shop's catalog, as its card shows it. */
export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  categoryName?: string;
  image?: string;
  /** The cheapest price across everything the item can be had for; none when it is "on request". */
  priceFrom?: number;
  featured: boolean;
  rating?: Rating;
}

/** `GET /businesses/{id}/catalog-items`: one card. */
interface CatalogItemCard {
  id: string;
  name: string;
  short_description: string | null;
  category: { name: string } | null;
  /** Laravel's decimal cast sends it as a string ("4250.00"). */
  price_from: number | string | null;
  is_featured: boolean;
  cover_url: string | null;
  cover_thumb_url: string | null;
  cover?: Media | null;
  rating_avg: number | null;
  rating_count: number;
}

/** The most items a shop's page loads; the page shows a few and opens the rest in place. */
const CATALOG_LIMIT = 24;

function toCatalogItem(card: CatalogItemCard): CatalogItem {
  const price = Number(card.price_from);
  const avg = Number(card.rating_avg);
  const image = card.cover_url || card.cover?.url || card.cover_thumb_url;
  return {
    id: card.id,
    name: card.name,
    ...(card.short_description ? { description: card.short_description } : {}),
    ...(card.category ? { categoryName: card.category.name } : {}),
    ...(image ? { image } : {}),
    ...(card.price_from != null && Number.isFinite(price) && price > 0 ? { priceFrom: price } : {}),
    featured: card.is_featured,
    ...(card.rating_count > 0 && Number.isFinite(avg) && avg > 0 ? { rating: { avg: Math.round(avg * 10) / 10, count: card.rating_count } } : {}),
  };
}

/** A shop's catalog, featured items first; `total` can be more than `items` holds. A shop without one gives none. */
export async function getBusinessCatalog(businessId: string): Promise<{ items: CatalogItem[]; total: number }> {
  const page = await orUndefined(api<Page<CatalogItemCard>>(`/businesses/${businessId}/catalog-items`, { query: { per_page: CATALOG_LIMIT } }));
  const items = (page?.data ?? []).map(toCatalogItem);
  // A stable sort keeps the API's own order within each group.
  return { items: [...items.filter((i) => i.featured), ...items.filter((i) => !i.featured)], total: page?.meta.total ?? 0 };
}
