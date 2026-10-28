"use server";

import { api, ApiError } from "@/lib/api/client";
import type { PromotionClaim } from "@/lib/api/types";
import { visitorIp } from "@/lib/api/visitor";
import { accessToken, withSession } from "@/lib/auth/session";
import type { MessageKey } from "@/lib/i18n/translate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CodeResult =
  | { ok: true; code: string; qrPayload?: string; expiresAt?: string | null }
  | { ok: false; error: MessageKey | "login" };

/** Why the API refused a claim (`errors.promotion`, the sentence for a `claim_refusal`) → a message. */
const REFUSALS: [RegExp, MessageKey][] = [
  [/needs no claim/i, "This offer has no code to claim."],
  [/your own business/i, "You cannot claim a code for your own shop's offer."],
  [/days and hours/i, "This offer is not available at this time of day. Try again during its timings."],
  [/every code/i, "All codes for this offer have been claimed."],
  [/as many times/i, "You have already claimed the most codes allowed for this offer."],
];

function codeFailure(error: unknown): CodeResult {
  if (error instanceof ApiError) {
    if (error.status === 404) return { ok: false, error: "This offer is not running right now." };
    if (error.status === 429) return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
    if (error.code === "MPIN_SETUP_REQUIRED") return { ok: false, error: "login" };
    const reason = error.field("promotion");
    if (reason) return { ok: false, error: REFUSALS.find(([pattern]) => pattern.test(reason))?.[1] ?? "This offer is not running right now." };
  }
  console.error("[offer code]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** A shared-code offer's code. Guests too; the tap is what the shop's stats count. */
export async function revealCodeAction(offerId: string): Promise<CodeResult> {
  if (!UUID.test(offerId)) return { ok: false, error: "This offer is not running right now." };
  try {
    const token = await accessToken();
    const { data } = await api<{ data: { code: string } }>(`/promotions/${offerId}/reveal-code`, {
      method: "POST",
      token,
      client: await visitorIp(),
    });
    return { ok: true, code: data.code };
  } catch (error) {
    return codeFailure(error);
  }
}

/** A personal code for a claim offer: a new one, or the one the visitor already holds. Needs login. */
export async function claimCodeAction(offerId: string): Promise<CodeResult> {
  if (!UUID.test(offerId)) return { ok: false, error: "This offer is not running right now." };
  try {
    const result = await withSession((token) =>
      api<{ data: PromotionClaim }>(`/promotions/${offerId}/claims`, { method: "POST", token, client: null }),
    );
    if (result === "signed-out") return { ok: false, error: "login" };
    return { ok: true, code: result.data.code, qrPayload: result.data.qr_payload, expiresAt: result.data.expires_at };
  } catch (error) {
    return codeFailure(error);
  }
}

export type OfferEvent = "detail_view" | "call" | "whatsapp" | "directions" | "share";
const EVENTS = new Set<OfferEvent>(["detail_view", "call", "whatsapp", "directions", "share"]);

/**
 * Counts what a visitor did with an offer, for the shop's stats in the business app. Never
 * renews a session (that would refresh the page) and never fails loudly.
 */
export async function trackOfferAction(offerId: string, type: OfferEvent): Promise<void> {
  if (!UUID.test(offerId) || !EVENTS.has(type)) return;
  try {
    await api(`/promotions/${offerId}/events`, {
      method: "POST",
      body: { type },
      token: await accessToken(),
      client: await visitorIp(),
    });
  } catch {
    // Stats are best effort.
  }
}
