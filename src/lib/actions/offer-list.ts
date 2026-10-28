"use server";

import { getNear, getOfferPins, getOffersPage } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import type { OfferFilters, OfferPin, OfferSummary } from "@/types";

/**
 * What a list was filtered by, as the page knows it: the area and category from the path, the
 * rest from the query. Plain strings, since a client sends them; `parseFilters` drops unknown values.
 */
export interface OfferListQuery {
  area?: string;
  category?: string;
  q?: string;
  sub?: string;
  type?: string;
  validity?: string;
  sort?: string;
}

const SLUG = /^[a-z0-9-]{1,80}$/i;
const MAX_PAGE = 200;

async function filtersFrom(query: OfferListQuery): Promise<OfferFilters> {
  const filters = parseFilters({ q: query.q, sub: query.sub, type: query.type, validity: query.validity, sort: query.sort });
  return {
    ...filters,
    page: undefined,
    category: query.category && SLUG.test(query.category) ? query.category : undefined,
    areas: query.area && SLUG.test(query.area) ? [query.area] : undefined,
    near: await getNear(),
  };
}

/** The next page of a list, for loading more as the visitor scrolls. */
export async function loadMoreOffersAction(query: OfferListQuery, page: number): Promise<{ items: OfferSummary[]; hasMore: boolean }> {
  if (!Number.isInteger(page) || page < 2 || page > MAX_PAGE) return { items: [], hasMore: false };
  try {
    return await getOffersPage(await filtersFrom(query), page);
  } catch (error) {
    console.error("[offers]", error);
    throw new Error("Could not load more offers");
  }
}

/** The list's shops as map pins. */
export async function loadOfferPinsAction(query: OfferListQuery): Promise<{ pins: OfferPin[]; total: number }> {
  try {
    return await getOfferPins(await filtersFrom(query));
  } catch (error) {
    console.error("[offers]", error);
    throw new Error("Could not load the map");
  }
}
