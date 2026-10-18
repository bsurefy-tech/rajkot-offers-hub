/**
 * Every custom event the site sends, with its properties. Names are `object_action` in snake_case; values are
 * strings, numbers or booleans, and bounded (an id or a template, never free text or a full path).
 */
/** What a visitor was doing when the login popup opened: which actions make people sign up. */
export type LoginReason =
  | "save_offer"
  | "save_shop"
  | "follow_shop"
  | "offer_code"
  | "shop_contact"
  | "zalak_like"
  | "zalak_report"
  | "rewards"
  | "notifications"
  | "saved";

export type EventMap = {
  offer_view: { offer_id: string };
  offer_contact: { offer_id: string; kind: "call" | "whatsapp" | "directions" };
  offer_share: { offer_id: string };
  offer_card_click: { offer_id: string };
  save_toggle: { kind: "offer" | "shop"; on: boolean };
  follow_toggle: { shop: string; on: boolean };
  search: { q_length: number; results: number };
  filter_apply: { filter: string; value: string };
  category_open: { category: string };
  area_select: { area: string };
  location_request: { source: "picker" | "prompt"; result: "granted" | "denied" | "error" };
  view_toggle: { view: "list" | "map" };
  hero_click: { slide: string };
  store_open: { shop: string; outlets: number };
  tab_change: { tab: string };
  login_prompt_shown: { reason: LoginReason };
  login_start: { method: "otp" | "mpin"; forced: boolean };
  login_verified: { method: "otp" | "mpin" };
  mpin_set: Record<string, never>;
  login_done: { new_user: boolean; popup: boolean };
  login_failed: { step: "mobile" | "code" | "mpin" | "set"; reason: string };
  signed_out: Record<string, never>;
  offer_code: { offer_id: string; kind: "reveal" | "claim"; result: "ok" | "login" | "error" };
  contact_reveal: { shop: string; kind: "call" | "whatsapp"; result: "ok" | "login" | "error" };
};
