"use server";

import { api, ApiError } from "@/lib/api/client";
import type {
  LoyaltyCode,
  LoyaltyReferral,
  LoyaltyRedemption,
  LoyaltyReward,
  LoyaltyScope,
  LoyaltyScratchCard,
  LoyaltyTask,
  LoyaltyTaskCompletion,
  LoyaltyTaskSummary,
  LoyaltyTransaction,
  LoyaltyWallet,
  Page,
} from "@/lib/api/types";
import { withSession } from "@/lib/auth/session";
import type { MessageKey } from "@/lib/i18n/translate";
import { loyaltyEnabled } from "@/lib/rewards/enabled";
import { summarise } from "@/lib/rewards/tasks";

/**
 * Points, rewards and scratch cards (the API's `/loyalty/*`). They are on the shopper's account, so every call
 * needs a login; "off" means the platform does not run the programme (the API answers 404).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What a read gives back: the data, or why there is none. */
export type Loaded<T> = { status: "ok"; data: T } | { status: "guest" } | { status: "off" } | { status: "error" };

/** What a change gives back. `detail` is the API's own sentence, written for the shopper (English). */
export type Done<T> = { ok: true; data: T } | { ok: false; error: MessageKey | "login"; detail?: string };

async function load<T>(read: (token: string) => Promise<T>): Promise<Loaded<T>> {
  if (!loyaltyEnabled()) return { status: "off" };
  try {
    const result = await withSession(read);
    return result === "signed-out" ? { status: "guest" } : { status: "ok", data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return { status: "off" };
      if (error.code === "MPIN_SETUP_REQUIRED") return { status: "guest" };
    }
    console.error("[rewards]", error);
    return { status: "error" };
  }
}

async function change<T>(write: (token: string) => Promise<T>, field: string): Promise<Done<T>> {
  if (!loyaltyEnabled()) return { ok: false, error: "Rewards are not available right now." };
  try {
    const result = await withSession(write);
    return result === "signed-out" ? { ok: false, error: "login" } : { ok: true, data: result };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) return { ok: false, error: "This is no longer available." };
      if (error.status === 429) return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
      if (error.code === "MPIN_SETUP_REQUIRED") return { ok: false, error: "login" };
      const detail = error.field(field) ?? Object.values(error.errors ?? {})[0]?.[0];
      if (error.status === 422 && detail) return { ok: false, error: "Something went wrong. Please try again.", detail };
    }
    console.error("[rewards]", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Points and scratch cards in a line, for the account page and the Rewards tab. */
export interface PointsSummary {
  balance: number;
  label: string;
  cards: number;
}

export async function pointsSummaryAction(): Promise<Loaded<PointsSummary>> {
  return load(async (token) => {
    const [wallets, cards] = await Promise.all([
      api<{ data: { platform: LoyaltyWallet } }>("/loyalty/wallets", { token, client: null }),
      api<Page<LoyaltyScratchCard>>("/loyalty/scratch-cards", { query: { status: "issued", per_page: 1 }, token, client: null }),
    ]);
    return { balance: wallets.data.platform.balance, label: wallets.data.platform.name, cards: cards.meta.total };
  });
}

export interface RewardsOverview {
  wallets: { platform: LoyaltyWallet; global: LoyaltyWallet };
  code: LoyaltyCode;
  cards: LoyaltyScratchCard[];
  rewards: LoyaltyReward[];
  redemptions: LoyaltyRedemption[];
  transactions: LoyaltyTransaction[];
  tasks: LoyaltyTask[];
  /** Where the shopper stands on the task list; worked out from `tasks` when the API sends no summary. */
  taskSummary: LoyaltyTaskSummary;
  /** Null when the platform has no referral programme. */
  referral: LoyaltyReferral | null;
}

/** Everything the Rewards page shows, in one go. */
export async function rewardsOverviewAction(): Promise<Loaded<RewardsOverview>> {
  return load(async (token) => {
    const get = <T>(path: string, query?: Record<string, string | number>) => api<T>(path, { query, token, client: null });
    const [wallets, code, cards, rewards, redemptions, transactions, tasks, referral] = await Promise.all([
      get<{ data: RewardsOverview["wallets"] }>("/loyalty/wallets"),
      get<{ data: LoyaltyCode }>("/loyalty/code"),
      get<Page<LoyaltyScratchCard>>("/loyalty/scratch-cards", { status: "issued", per_page: 20 }),
      get<Page<LoyaltyReward>>("/loyalty/rewards", { wallet: "platform", per_page: 50 }),
      get<Page<LoyaltyRedemption>>("/loyalty/redemptions", { per_page: 30 }),
      get<Page<LoyaltyTransaction>>("/loyalty/transactions", { wallet: "platform", per_page: 30 }),
      get<Page<LoyaltyTask> & { meta: { summary?: LoyaltyTaskSummary } }>("/loyalty/tasks", { per_page: 50 }),
      get<{ data: LoyaltyReferral }>("/loyalty/referral").then(
        (r) => r.data,
        (error) => {
          // Referrals are their own feature: without it the rest still works.
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        },
      ),
    ]);
    return {
      wallets: wallets.data,
      code: code.data,
      cards: cards.data,
      rewards: rewards.data,
      redemptions: redemptions.data,
      transactions: transactions.data,
      tasks: tasks.data,
      taskSummary: summarise(tasks.data, tasks.meta.summary),
      referral,
    };
  });
}

/** The history of one wallet (the global pool is a separate balance). */
export async function transactionsAction(wallet: LoyaltyScope): Promise<Loaded<LoyaltyTransaction[]>> {
  if (wallet !== "platform" && wallet !== "global") return { status: "error" };
  return load(async (token) => (await api<Page<LoyaltyTransaction>>("/loyalty/transactions", { query: { wallet, per_page: 30 }, token, client: null })).data);
}

/** Every go the shopper has had at one task, newest first: what was sent, and how each was decided. */
export async function taskTimelineAction(taskId: string): Promise<Loaded<LoyaltyTaskCompletion[]>> {
  if (!UUID.test(taskId)) return { status: "error" };
  return load(async (token) => {
    const page = await api<Page<LoyaltyTaskCompletion>>("/loyalty/task-completions", { query: { task: taskId, per_page: 20 }, token, client: null });
    // An API from before the filter sends every hand-in; keep this task's.
    return page.data.filter((completion) => completion.task_id === taskId);
  });
}

/** Spends points on a reward. `requestId` (a UUID made when the sheet opened) makes a repeated tap safe. */
export async function redeemRewardAction(rewardId: string, requestId: string): Promise<Done<LoyaltyRedemption>> {
  if (!UUID.test(rewardId) || !UUID.test(requestId)) return { ok: false, error: "This is no longer available." };
  const done = await change(
    (token) =>
      api<{ data: LoyaltyRedemption }>(`/loyalty/rewards/${rewardId}/redeem`, { method: "POST", body: { request_id: requestId }, token, client: null }),
    "points",
  );
  return done.ok ? { ok: true, data: done.data.data } : done;
}

/** Hands an unused reward code back; the points return to the wallet. */
export async function giveBackRedemptionAction(id: string): Promise<Done<LoyaltyRedemption>> {
  if (!UUID.test(id)) return { ok: false, error: "This is no longer available." };
  const done = await change((token) => api<{ data: LoyaltyRedemption }>(`/loyalty/redemptions/${id}`, { method: "DELETE", token, client: null }), "redemption");
  return done.ok ? { ok: true, data: done.data.data } : done;
}

/** Scratches a card. The prize is drawn on the server, and scratching again gives the same result. */
export async function scratchCardAction(id: string): Promise<Done<LoyaltyScratchCard>> {
  if (!UUID.test(id)) return { ok: false, error: "This is no longer available." };
  const done = await change((token) => api<{ data: LoyaltyScratchCard }>(`/loyalty/scratch-cards/${id}/scratch`, { method: "POST", token, client: null }), "card");
  return done.ok ? { ok: true, data: done.data.data } : done;
}

const PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROOF_MAX_BYTES = 10 * 1024 * 1024;

/** Hands in a task with a screenshot as proof (and an optional note). A person checks it before the points arrive. */
export async function submitTaskAction(taskId: string, form: FormData): Promise<Done<LoyaltyTask>> {
  if (!UUID.test(taskId)) return { ok: false, error: "This is no longer available." };
  const proof = form.get("proof");
  if (!(proof instanceof File) || proof.size === 0) return { ok: false, error: "Choose a screenshot to send." };
  if (!PROOF_TYPES.has(proof.type) || proof.size > PROOF_MAX_BYTES) return { ok: false, error: "Use a JPG, PNG or WebP picture under 10 MB." };
  const body = new FormData();
  body.set("proof", proof);
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (note) body.set("note", note);
  const done = await change((token) => api<{ data: LoyaltyTask }>(`/loyalty/tasks/${taskId}/submit`, { method: "POST", body, token, client: null }), "proof");
  return done.ok ? { ok: true, data: done.data.data } : done;
}

/** Enters a friend's invite code. */
export async function applyReferralAction(code: string): Promise<Done<null>> {
  const clean = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9]{3,32}$/.test(clean)) return { ok: false, error: "That invite code doesn't look right." };
  const done = await change((token) => api("/loyalty/referrals/apply", { method: "POST", body: { code: clean }, token, client: null }), "code");
  return done.ok ? { ok: true, data: null } : done;
}

/** Saves the shopper's profile on a network (some tasks need it so the reviewer can find the follow). */
export async function saveSocialHandleAction(provider: string, profile: string): Promise<Done<null>> {
  const clean = String(profile).trim().slice(0, 300);
  if (!/^[a-z]{1,20}$/.test(provider) || !clean) return { ok: false, error: "Enter your profile link or username." };
  const done = await change((token) => api(`/loyalty/social-handles/${provider}`, { method: "PUT", body: { profile: clean }, token, client: null }), "profile");
  return done.ok ? { ok: true, data: null } : done;
}
