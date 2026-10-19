import type { MessageKey } from "@/lib/i18n/translate";
import type { BusinessFilters, BusinessSortKey } from "@/types";

export const BUSINESS_SORT_OPTIONS: { value: BusinessSortKey; label: MessageKey }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Top rated" },
  { value: "nearest", label: "Nearest first" },
];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const SLUG = /^[a-z0-9-]{1,80}$/i;

/** Reads shop-list filters from URL search params; unknown values are dropped. */
export function parseBusinessFilters(params: RawParams): BusinessFilters {
  const page = Number(first(params.page));
  const category = first(params.category);
  const area = first(params.area);
  return {
    q: first(params.q)?.slice(0, 100) || undefined,
    category: category && SLUG.test(category) ? category : undefined,
    area: area && SLUG.test(area) ? area : undefined,
    sort: BUSINESS_SORT_OPTIONS.find((o) => o.value === first(params.sort))?.value,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

/** Builds "?a=b" for a filter state. Any change other than `page` starts again from page 1. */
export function businessFiltersToQuery(filters: BusinessFilters, patch: Partial<BusinessFilters> = {}) {
  const next: BusinessFilters = { ...filters, ...patch };
  if (!("page" in patch)) delete next.page;

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.area) params.set("area", next.area);
  if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}
