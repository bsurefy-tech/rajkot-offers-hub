export type CategoryIcon =
  | "utensils"
  | "shirt"
  | "scissors"
  | "smartphone"
  | "dumbbell"
  | "sofa"
  | "wrench"
  | "gift"
  | "ticket"
  | "graduation-cap"
  | "car"
  | "coffee"
  | "shopping-bag"
  | "pizza"
  | "heart-pulse"
  | "gem"
  | "candy"
  | "plane"
  | "shopping-basket";

export interface Category {
  slug: string;
  /** Full name, e.g. "Fashion & Clothing". */
  name: string;
  /** Short label for chips and the home icon row, e.g. "Fashion". */
  shortName: string;
  icon: CategoryIcon;
  image: string;
  description: string;
  /** Child categories; `slug` is the filter value. Empty in lists that don't need them. */
  subcategories: { slug: string; name: string }[];
  /** Shown in the home icon row. */
  inHomeRow: boolean;
  /** Shown as the seasonal banner instead of a grid tile. */
  featured?: boolean;
}

export interface CategoryWithCount extends Category {
  offerCount: number;
}

export interface Area {
  slug: string;
  name: string;
}

export interface AreaWithCount extends Area {
  /** Live offers in this area. */
  offerCount: number;
}

export type OfferType = "percent" | "flat" | "bogo" | "combo" | "other";

export interface OfferStep {
  text: string;
}

export type RedemptionMode = "walk_in" | "shared_code" | "unique_claim";

export interface Offer {
  /** The API's id (UUID). */
  id: string;
  /** The offer's identity: "<slug>-<id>". Saved offers and list keys use it; the address does not. */
  slug: string;
  /** What the offer's address ends with: "/<shop>/<urlSlug>". Unique within its shop. */
  urlSlug: string;
  title: string;
  badge: string;
  type: OfferType;
  /** Approximate discount in percent, used for sorting. */
  discount: number;
  categorySlug: string;
  subcategory?: string;
  businessSlug: string;
  businessName: string;
  areaSlug: string;
  areaName: string;
  images: string[];
  /** One-line offer summary shown in the details list. */
  offerText: string;
  validFrom: string;
  validTo: string;
  createdAt: string;
  timings: string;
  address: string;
  steps: OfferStep[];
  terms: string[];
  redemptionMode: RedemptionMode;
  /** Derived from validTo at read time. */
  isExpired: boolean;
  daysLeft: number;
  /** Km to the shop's nearest outlet; only on lists read with the visitor's location. */
  distanceKm?: number;
  /** Smallest bill (₹) the offer applies to. */
  minSpend?: number;
  /** `images[0]` is the shop's logo standing in for a missing offer photo, so show it whole. */
  imageIsLogo?: boolean;
  /** Average of approved reviews; only once the offer has one. */
  rating?: Rating;
  /** Branches the offer is valid at ("Main branch, Yagnik Road"), when the shop lists more than its main one. */
  validAt: string[];
  /** The outlets the offer is valid at, for the map; empty when the API does not say. */
  branches: { id: string; name: string; areaName: string; isMain: boolean; geo?: { lat: number; lng: number } }[];
  /** Where to send directions: the offer's branch when it is not valid at the main one. */
  geo?: { lat: number; lng: number };
}

/** The fields an offer card needs. */
export type OfferSummary = Pick<
  Offer,
  | "id"
  | "slug"
  | "urlSlug"
  | "title"
  | "badge"
  | "businessSlug"
  | "businessName"
  | "areaName"
  | "images"
  | "validTo"
  | "createdAt"
  | "isExpired"
  | "daysLeft"
  | "distanceKm"
  | "minSpend"
  | "imageIsLogo"
  | "rating"
>;

/** One shop on the offers map, with its offers from the list being viewed. */
export interface OfferPin {
  businessSlug: string;
  businessName: string;
  areaName: string;
  lat: number;
  lng: number;
  /** Km from the visitor, when they set a location. */
  distanceKm?: number;
  offers: { urlSlug: string; title: string; badge: string; image: string; imageIsLogo?: boolean }[];
}

export interface OpeningHours {
  /** 0 = Monday … 6 = Sunday. */
  day: number;
  /** 24h "HH:MM", or null when closed all day. */
  opens: string | null;
  closes: string | null;
}

export interface Rating {
  /** 1–5. */
  avg: number;
  count: number;
}

export interface Review {
  id: string;
  /** 1–5. */
  rating: number;
  title: string;
  body: string;
  author: string;
  /** "YYYY-MM-DD". */
  date: string;
  /** The reviewer redeemed the offer's code at the shop. */
  verified: boolean;
  /** The outlet the review is about, when the shop has several. */
  outlet?: string;
  /** Quality, service, value… each out of 5. */
  scores: { label: string; score: number }[];
}

/** One of a shop's outlets; the main one comes first. */
export interface Outlet {
  id: string;
  name: string;
  isMain: boolean;
  areaName: string;
  address: string;
  geo?: { lat: number; lng: number };
  hours: OpeningHours[];
  rating?: Rating;
}

export interface Business {
  /** The API's id (UUID); reviews are read by it. */
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  areaSlug: string;
  areaName: string;
  cover: string;
  /** The shop's logo, when it has uploaded one. */
  logo?: string;
  about: string;
  /** Full one-line address for display. */
  address: string;
  /** Street part only ("12, Sample Complex, Kalawad Road"), for structured data. */
  streetAddress: string;
  postalCode: string;
  /** Masked ("+9198••••••02") until a signed-in visitor reveals them. */
  phone: string;
  whatsapp: string;
  contactMasked: boolean;
  instagram?: string;
  website?: string;
  hours: OpeningHours[];
  /** Every outlet, main first; one entry for a shop with a single location. */
  outlets: Outlet[];
  photos: string[];
  geo: { lat: number; lng: number };
}

/** A shop on a list: what its card shows. */
export interface BusinessSummary {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  categoryName?: string;
  city?: string;
  /** Its cover photo, or its logo when it has no photo; none for a shop with neither. */
  image?: string;
  imageIsLogo?: boolean;
  verified: boolean;
  rating?: Rating;
}

export type BusinessSortKey = "recommended" | "rating" | "nearest";

export interface BusinessFilters {
  q?: string;
  category?: string;
  /** An area's slug. */
  area?: string;
  sort?: BusinessSortKey;
  page?: number;
  /** The visitor's location (from the location cookie, never the URL). */
  near?: { lat: number; lng: number };
}

export type SortKey = "newest" | "ending" | "discount" | "nearest";
export type ValidityKey = "today" | "week" | "month";

export interface OfferFilters {
  q?: string;
  category?: string;
  subcategory?: string;
  areas?: string[];
  type?: OfferType;
  validity?: ValidityKey;
  sort?: SortKey;
  page?: number;
  /** The visitor's location (from the location cookie, never the URL). */
  near?: { lat: number; lng: number };
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}
