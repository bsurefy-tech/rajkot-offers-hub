import { api, orUndefined } from "@/lib/api/client";
import { toReview } from "@/lib/api/mappers";
import type { Page, ReviewResource } from "@/lib/api/types";
import type { Outlet, Review, ReviewCriterion } from "@/types";

const RECENT = 5;

/** The newest approved reviews of an offer, and how many it has in all. */
export async function getOfferReviews(offerId: string): Promise<{ items: Review[]; total: number }> {
  const page = await orUndefined(api<Page<ReviewResource>>(`/promotions/${offerId}/reviews`, { query: { per_page: RECENT } }));
  return { items: page?.data.map((r) => toReview(r)) ?? [], total: page?.meta.total ?? 0 };
}

/** The newest approved reviews of a shop; each names its outlet when the shop has several. */
export async function getBusinessReviews(businessId: string, outlets: Outlet[]): Promise<{ items: Review[]; total: number }> {
  const page = await orUndefined(api<Page<ReviewResource>>(`/businesses/${businessId}/reviews`, { query: { per_page: RECENT } }));
  return { items: page?.data.map((r) => toReview(r, outlets)) ?? [], total: page?.meta.total ?? 0 };
}

/** What a review of a shop or an offer is rated on ("Quality", "Service"…), in order. */
export async function getReviewCriteria(target: "shop" | "offer", id: string): Promise<ReviewCriterion[]> {
  const path = `/${target === "shop" ? "businesses" : "promotions"}/${id}/reviews/criteria`;
  const result = await orUndefined(api<{ data: (ReviewCriterion & { sort_order: number })[] }>(path));
  return [...(result?.data ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(({ key, label }) => ({ key, label }));
}
