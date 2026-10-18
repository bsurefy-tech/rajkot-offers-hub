/** The kinds of page reports group by; a shop or offer address is unbounded, so reports never group by path. */
export type PageType =
  | "home"
  | "offers"
  | "offer"
  | "categories"
  | "category"
  | "area_or_shop"
  | "shop"
  | "zalak"
  | "status"
  | "rewards"
  | "account"
  | "login"
  | "saved"
  | "notifications"
  | "contact"
  | "how_it_works"
  | "submit_offer"
  | "legal"
  | "not_found";

const STATIC: Record<string, PageType> = {
  offers: "offers",
  categories: "categories",
  businesses: "shop",
  zalak: "zalak",
  status: "status",
  rewards: "rewards",
  account: "account",
  login: "login",
  saved: "saved",
  notifications: "notifications",
  contact: "contact",
  "how-it-works": "how_it_works",
  "submit-offer": "submit_offer",
  privacy: "legal",
  terms: "legal",
};

/**
 * The page type of a public path (no locale prefix). "/<x>" is an area home or a shop, which the path alone cannot
 * tell apart; pages that know say so themselves later.
 */
export function pageTypeOf(pathname: string): PageType {
  const [first, second, third] = pathname.split("/").slice(1);
  if (!first) return "home";
  const known = STATIC[first];
  if (known === "categories") return second ? "category" : "categories";
  if (known) return known;
  if (!second) return "area_or_shop";
  if (second === "offers") return "offers";
  if (second === "categories") return third ? "category" : "categories";
  return "offer";
}
