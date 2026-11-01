"use server";

import { api, ApiError } from "@/lib/api/client";
import { withSession } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CRITERION = /^[a-z0-9_]{1,50}$/;

export type ReviewTarget = "shop" | "offer";

export interface ReviewInput {
  /** Stars (1–5) per rating criterion key; at least one. */
  ratings: Record<string, number>;
  title?: string;
  body?: string;
}

/** "own": the visitor runs the shop. "duplicate": they have reviewed it before. */
export type ReviewResult = "ok" | "signed-out" | "own" | "duplicate" | "error";

/** Posts the signed-in visitor's review of a shop or an offer (by id). It is live at once. */
export async function submitReviewAction(target: ReviewTarget, id: string, input: ReviewInput): Promise<ReviewResult> {
  if ((target !== "shop" && target !== "offer") || typeof id !== "string" || !UUID.test(id) || !input || typeof input !== "object") return "error";
  const ratings = Object.fromEntries(
    Object.entries(input.ratings ?? {}).filter(([key, stars]) => CRITERION.test(key) && Number.isInteger(stars) && stars >= 1 && stars <= 5),
  );
  if (!Object.keys(ratings).length) return "error";
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 150) : "";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 5000) : "";
  const path = `/${target === "shop" ? "businesses" : "promotions"}/${id}/reviews`;
  try {
    const result = await withSession((token) =>
      api(path, { method: "POST", body: { ratings, ...(title ? { title } : {}), ...(body ? { body } : {}) }, token, client: null }),
    );
    return result === "signed-out" ? "signed-out" : "ok";
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      if (error.field("review")) return "own";
      if (error.field("user_id")) return "duplicate";
    }
    console.error("[review]", error);
    return "error";
  }
}
