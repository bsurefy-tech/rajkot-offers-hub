"use server";

import { api } from "@/lib/api/client";
import type { Page } from "@/lib/api/types";
import { withSession } from "@/lib/auth/session";

/**
 * The visitor's notifications (the API keeps them per app): "New offer from <shop>" for the shops they follow.
 * They live on the account, so a guest has none.
 */

export interface SiteNotification {
  id: string;
  type: string | null;
  title: string;
  body: string;
  /** Where a tap goes: a same-site path, or null when there is nothing to open. */
  href: string | null;
  read: boolean;
  createdAt: string;
}

export type NotificationsResult =
  | { status: "guest" }
  | { status: "error" }
  | { status: "member"; items: SiteNotification[]; unread: number; hasMore: boolean };

interface ApiNotification {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  action: { type?: string; resource?: string; arguments?: { id?: string; business_slug?: string } } | null;
  read_at: string | null;
  created_at: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHOP = /^[a-z0-9][a-z0-9-]{0,120}$/i;
const PER_PAGE = 30;

/** An offer opens its page ("/offers/<anything>-<id>" goes to the offer's own address); points, rewards and tasks open Rewards. */
function hrefOf(action: ApiNotification["action"], type: string | null) {
  if (type?.startsWith("loyalty.")) return "/rewards";
  const id = action?.arguments?.id;
  // A shop you follow posted: its status opens the status viewer on that shop, its reel opens Zalak on that reel.
  if (action?.type === "screen" && action.resource === "status") {
    const shop = action.arguments?.business_slug;
    return typeof shop === "string" && SHOP.test(shop) ? `/status?shop=${encodeURIComponent(shop)}` : "/";
  }
  if (action?.type === "screen" && action.resource === "reel") return typeof id === "string" && UUID.test(id) ? `/zalak?start=${id}` : "/zalak";
  return action?.type === "screen" && action.resource === "promotion" && typeof id === "string" && UUID.test(id) ? `/offers/offer-${id}` : null;
}

function toNotification(n: ApiNotification): SiteNotification {
  return { id: n.id, type: n.type, title: n.title ?? "", body: n.body ?? "", href: hrefOf(n.action, n.type), read: Boolean(n.read_at), createdAt: n.created_at };
}

/** The latest notifications and the unread count, or "guest" when nobody is signed in. */
export async function loadNotificationsAction(): Promise<NotificationsResult> {
  try {
    const result = await withSession(async (token) => {
      const page = await api<Page<ApiNotification> & { stats?: { unread_count?: number } }>("/notifications", { query: { per_page: PER_PAGE }, token, client: null });
      return { items: page.data.map(toNotification), unread: page.stats?.unread_count ?? 0, hasMore: page.meta.last_page > 1 };
    });
    return result === "signed-out" ? { status: "guest" } : { status: "member", ...result };
  } catch (error) {
    console.error("[notifications]", error);
    return { status: "error" };
  }
}

/** The unread count for the header bell; 0 for a guest or when the API can't be reached. */
export async function unreadCountAction(): Promise<number> {
  try {
    const result = await withSession((token) => api<{ data: { unread_count: number } }>("/notifications/unread-count", { token, client: null }));
    return result === "signed-out" ? 0 : (result.data.unread_count ?? 0);
  } catch {
    return 0;
  }
}

/** Marks one notification read (`id` omitted: all of them). */
export async function markReadAction(id?: string): Promise<boolean> {
  if (id !== undefined && !UUID.test(id)) return false;
  try {
    const result = await withSession((token) => api(id ? `/notifications/${id}/read` : "/notifications/read-all", { method: "PUT", token, client: null }));
    return result !== "signed-out";
  } catch (error) {
    console.error("[notifications]", error);
    return false;
  }
}

/** Whether the visitor wants a push when a shop they follow posts (a new offer, status or reel). Null for a guest or when it cannot be read. */
export async function loadFollowingPushAction(): Promise<boolean | null> {
  try {
    const result = await withSession((token) => api<{ data: { following?: boolean } }>("/user/notification-preferences", { token, client: null }));
    return result === "signed-out" ? null : (result.data.following ?? true);
  } catch {
    return null;
  }
}

/** Turns those pushes on or off. The notification itself still lands in the list: muted is not lost. */
export async function setFollowingPushAction(on: boolean): Promise<boolean> {
  if (typeof on !== "boolean") return false;
  try {
    const result = await withSession((token) => api("/user/notification-preferences", { method: "PUT", body: { following: on }, token, client: null }));
    return result !== "signed-out";
  } catch (error) {
    console.error("[notification-preferences]", error);
    return false;
  }
}
