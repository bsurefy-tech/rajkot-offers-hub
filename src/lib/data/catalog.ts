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

/** One way to get an item: buy, rent, book, or ask the shop. No `amount` means "Price on request". */
export interface CatalogPrice {
  kind: "sale" | "rent" | "book" | "enquire";
  amount?: number;
  /** Top of a range ("₹4,000 – ₹6,000"). */
  max?: number;
  /** The price is where it starts ("From ₹4,000"). */
  from?: boolean;
  /** The price before a discount, shown struck through. */
  was?: number;
  unit: "item" | "hour" | "day" | "night" | "person" | "event";
}

/** What an item's details popup adds to its card. */
export interface CatalogItemDetail {
  /** The full description; the card has only the short one. */
  about?: string;
  /** Cover first, then the gallery. */
  images: string[];
  prices: CatalogPrice[];
  /** What it comes in: sizes, colours… */
  options: { label: string; values: string[] }[];
  /** Fabric, occasion… */
  details: { label: string; value: string }[];
  brochure?: { url: string; name?: string; pages?: number };
}

type Choice = { label: string };

/** `GET /businesses/{id}/catalog-items/{item}`: the parts the popup shows. */
interface CatalogItemResource {
  description: string | null;
  cover: Media | null;
  gallery: Media[];
  offers: {
    type: CatalogPrice["kind"];
    price_type: "fixed" | "starting_from" | "range" | "on_request";
    price: number | string | null;
    price_max: number | string | null;
    compare_at_price: number | string | null;
    billing_unit: CatalogPrice["unit"];
  }[];
  variant_options: { name: string; values: Choice[] }[];
  attributes: { name: string; unit: string | null; value?: Choice | string | number | boolean | null; values?: Choice[] }[];
  brochure: { url: string; name: string | null; pages: number | null } | null;
}

/** A positive amount, or none ("4250.00" → 4250). */
function money(value: number | string | null) {
  const n = Number(value);
  return value != null && Number.isFinite(n) && n > 0 ? n : undefined;
}

function attributeValue(attribute: CatalogItemResource["attributes"][number]) {
  const { value, values, unit } = attribute;
  if (values?.length) return values.map((v) => v.label).join(", ");
  if (value && typeof value === "object") return value.label;
  if (typeof value === "string" || typeof value === "number") return unit ? `${value} ${unit}` : String(value);
  return "";
}

/** One catalog item's details (by id), for its popup; none when it is gone. */
export async function getCatalogItem(businessId: string, itemId: string): Promise<CatalogItemDetail | undefined> {
  const result = await orUndefined(api<{ data: CatalogItemResource }>(`/businesses/${businessId}/catalog-items/${itemId}`));
  if (!result) return undefined;
  const item = result.data;
  return {
    ...(item.description ? { about: item.description } : {}),
    images: [...new Set([item.cover?.url, ...item.gallery.map((m) => m.url)].filter((url): url is string => !!url))],
    prices: item.offers.map((offer) => {
      const amount = offer.price_type === "on_request" ? undefined : money(offer.price);
      const max = offer.price_type === "range" ? money(offer.price_max) : undefined;
      const was = money(offer.compare_at_price);
      return {
        kind: offer.type,
        unit: offer.billing_unit,
        ...(amount ? { amount } : {}),
        ...(amount && max && max > amount ? { max } : {}),
        ...(amount && offer.price_type === "starting_from" ? { from: true } : {}),
        ...(amount && was && was > amount ? { was } : {}),
      };
    }),
    options: item.variant_options.map((o) => ({ label: o.name, values: o.values.map((v) => v.label) })).filter((o) => o.values.length),
    details: item.attributes.map((a) => ({ label: a.name, value: attributeValue(a) })).filter((d) => d.value),
    ...(item.brochure?.url ? { brochure: { url: item.brochure.url, ...(item.brochure.name ? { name: item.brochure.name } : {}), ...(item.brochure.pages ? { pages: item.brochure.pages } : {}) } } : {}),
  };
}
