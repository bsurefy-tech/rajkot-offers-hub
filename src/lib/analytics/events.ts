/**
 * Every custom event the site sends, with its properties. Names are `object_action` in snake_case; values are
 * strings, numbers or booleans, and bounded (an id or a template, never free text or a full path).
 */
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
};
