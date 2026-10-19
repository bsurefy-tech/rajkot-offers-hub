"use server";

import { parseBusinessFilters } from "@/lib/business-filters";
import { getBusinessesPage, getNear } from "@/lib/data";
import type { BusinessSummary } from "@/types";

/** What a shop list was filtered by, as plain strings, since a client sends them; unknown values are dropped. */
export interface BusinessListQuery {
  q?: string;
  category?: string;
  area?: string;
  sort?: string;
}

const MAX_PAGE = 200;

/** The next page of a shop list, for loading more as the visitor scrolls. */
export async function loadMoreBusinessesAction(query: BusinessListQuery, page: number): Promise<{ items: BusinessSummary[]; hasMore: boolean }> {
  if (!Number.isInteger(page) || page < 2 || page > MAX_PAGE) return { items: [], hasMore: false };
  try {
    return await getBusinessesPage({ ...parseBusinessFilters({ ...query }), page: undefined, near: await getNear() }, page);
  } catch (error) {
    console.error("[businesses]", error);
    throw new Error("Could not load more shops");
  }
}
