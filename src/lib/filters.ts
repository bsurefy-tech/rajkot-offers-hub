import type { MessageKey } from "@/lib/i18n/translate";
import type { OfferFilters, OfferType, SortKey, ValidityKey } from "@/types";

export const OFFER_TYPES: { value: OfferType; label: MessageKey }[] = [
  { value: "percent", label: "% discount" },
  { value: "flat", label: "Flat discount" },
  { value: "bogo", label: "Buy 1 get 1 free" },
  { value: "combo", label: "Combo" },
];

export const SUBMIT_OFFER_TYPES: { value: OfferType; label: MessageKey }[] = [
  { value: "percent", label: "% discount" },
  { value: "flat", label: "Flat discount" },
  { value: "bogo", label: "Buy 1 get 1 free" },
  { value: "combo", label: "Combo / package" },
  { value: "other", label: "Other" },
];

export const VALIDITY_OPTIONS: { value: ValidityKey; label: MessageKey }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export const SORT_OPTIONS: { value: SortKey; label: MessageKey }[] = [
  { value: "newest", label: "Newest offers" },
  { value: "ending", label: "Ending soon" },
  { value: "discount", label: "Highest discount" },
  { value: "nearest", label: "Nearest first" },
];

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(value: string | undefined, options: { value: T }[]) {
  return options.find((o) => o.value === value)?.value;
}

/** Reads offer filters from URL search params; unknown values are dropped. */
export function parseFilters(params: RawParams): OfferFilters {
  const page = Number(first(params.page));
  return {
    q: first(params.q)?.slice(0, 100) || undefined,
    subcategory: first(params.sub) || undefined,
    type: oneOf(first(params.type), OFFER_TYPES),
    validity: oneOf(first(params.validity), VALIDITY_OPTIONS),
    sort: oneOf(first(params.sort), SORT_OPTIONS),
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

/**
 * Builds "?a=b" for a filter state. Any change other than `page`
 * starts again from page 1.
 */
export function filtersToQuery(filters: OfferFilters, patch: Partial<OfferFilters> = {}) {
  const next: OfferFilters = { ...filters, ...patch };
  if (!("page" in patch)) delete next.page;

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.subcategory) params.set("sub", next.subcategory);
  if (next.type) params.set("type", next.type);
  if (next.validity) params.set("validity", next.validity);
  if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}
