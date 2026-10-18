/**
 * Every custom event the site sends, with its properties. Names are `object_action` in snake_case; values are
 * strings, numbers or booleans, and bounded (an id or a template, never free text or a full path).
 */
export type EventMap = {
  offer_view: { offer_id: string };
  offer_contact: { offer_id: string; kind: "call" | "whatsapp" | "directions" };
  offer_share: { offer_id: string };
};
