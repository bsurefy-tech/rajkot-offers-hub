import { daysBetween, toIsoDay } from "@/lib/format";
import { img } from "@/lib/mock/images";
import type { Area, Business, BusinessSummary, Category, CategoryIcon, Offer, OfferSummary, OfferType, OpeningHours, Outlet, Rating, Review } from "@/types";
import type { Address, AreaCount, Branch, BranchResource, BusinessCard, BusinessHours, BusinessResource, CategoryChip, PromotionCard, PromotionDetail, PromotionType, ReviewResource } from "./types";

/**
 * API resources → the site's domain types (`@/types`), so pages and components
 * stay as they were. Everything the API does not send is derived here.
 */

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "/offers/<slug>-<id>": readable, and the id is what the API looks offers up by. */
export function offerHandle(card: Pick<PromotionCard, "slug" | "id">) {
  return `${card.slug}-${card.id}`;
}

/** The API id inside an offer handle, or null when it is not one. */
export function offerIdFromHandle(handle: string) {
  return handle.match(UUID)?.[0]?.toLowerCase() ?? null;
}

const TYPE_FROM_API: Record<PromotionType, OfferType> = {
  percent_off: "percent",
  amount_off: "flat",
  buy_x_get_y: "bogo",
  free_gift: "other",
  custom: "combo",
};

/** The site's filter value → the API's `type`. */
export const TYPE_TO_API: Record<OfferType, PromotionType> = {
  percent: "percent_off",
  flat: "amount_off",
  bogo: "buy_x_get_y",
  other: "free_gift",
  combo: "custom",
};

/** Rajkot day of an API timestamp. */
const day = (timestamp: string) => toIsoDay(new Date(timestamp));

function isPast(card: Pick<PromotionCard, "lifecycle">) {
  return card.lifecycle === "expired" || card.lifecycle === "ended" || card.lifecycle === "taken_down";
}

/** A positive amount from the API's number or decimal string ("25000.00"); undefined otherwise. */
function amount(value: number | string | null | undefined) {
  const number = Number(value);
  return value != null && Number.isFinite(number) && number > 0 ? number : undefined;
}

/** A rating once there is a review to average; null counts and zero averages show nothing. */
function rating(avg: number | string | null | undefined, count: number | undefined): Rating | undefined {
  const value = Number(avg);
  return count && count > 0 && Number.isFinite(value) && value > 0 ? { avg: Math.round(value * 10) / 10, count } : undefined;
}

export function toOfferSummary(card: PromotionCard | PromotionDetail): OfferSummary {
  const validTo = day(card.ends_at);
  // Cards carry `cover_url`; the detail resource carries a `cover` object instead.
  const cover = card.cover_url || ("cover" in card ? card.cover?.url : undefined) || card.cover_thumb_url;
  // Without a photo of its own, the offer shows its shop's logo rather than a stock picture.
  const logo = cover ? undefined : card.business.logo_url;
  const minSpend = amount(card.min_spend);
  const stars = rating(card.rating_avg, card.rating_count);
  return {
    id: card.id,
    slug: offerHandle(card),
    urlSlug: card.slug,
    title: card.title,
    badge: card.headline || card.value_label,
    businessSlug: card.business.slug,
    businessName: card.business.name,
    areaName: card.business.area || card.business.city || "Rajkot",
    images: [cover || logo || FALLBACK_IMAGE],
    ...(logo ? { imageIsLogo: true } : {}),
    validTo,
    createdAt: day(card.created_at ?? card.starts_at),
    isExpired: isPast(card),
    daysLeft: daysBetween(toIsoDay(new Date()), validTo),
    ...(card.distance_km != null ? { distanceKm: card.distance_km } : {}),
    ...(minSpend ? { minSpend } : {}),
    ...(stars ? { rating: stars } : {}),
  };
}

const STEPS: Record<PromotionDetail["redemption_mode"], string[]> = {
  walk_in: ["Visit the store", "Show this offer", "Get the discount on your bill"],
  shared_code: ["Tap “Claim my code” to see the offer code", "Show the code at the store", "Get the discount on your bill"],
  unique_claim: ["Claim your personal code here", "Show the code at the store", "Get the discount on your bill"],
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "14:30" → "2:30 PM". */
function clock(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour12 = h % 12 || 12;
  return `${hour12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

function timings(detail: PromotionDetail) {
  const hours = detail.available_from && detail.available_until ? `${clock(detail.available_from)} – ${clock(detail.available_until)}` : "During store hours";
  const days = detail.available_days?.length && detail.available_days.length < 7 ? detail.available_days.map((d) => WEEKDAYS[d - 1]).join(", ") : null;
  return days ? `${days}, ${hours}` : hours;
}

/** "Main branch, Yagnik Road"; just "Mavdi" when the branch is named after its area. */
function branchLabel(branch: Branch) {
  return branch.area && branch.area !== branch.name ? `${branch.name}, ${branch.area}` : branch.name;
}

function branchGeo(branch: Branch | undefined) {
  const lat = Number(branch?.latitude);
  const lng = Number(branch?.longitude);
  return lat && lng ? { lat, lng } : undefined;
}

export function toOffer(detail: PromotionDetail, business?: Business): Offer {
  const summary = toOfferSummary(detail);
  const own = [detail.cover?.url, ...detail.gallery.map((m) => m.url)].filter((url): url is string => Boolean(url));
  const shop = business?.photos.filter((url) => url !== FALLBACK_IMAGE) ?? [];
  // The shop's area and address are its main branch's; an offer only at other branches shows theirs.
  const branches = detail.valid_at;
  const elsewhere = branches.length > 0 && !branches.some((b) => b.is_main);
  const areaName = elsewhere ? (branches[0].area || branches[0].city || "Rajkot") : summary.areaName;
  const city = branches[0]?.city || "Rajkot";
  return {
    ...summary,
    images: own.length ? own : shop.length ? shop : summary.images,
    imageIsLogo: !own.length && !shop.length && summary.imageIsLogo,
    type: TYPE_FROM_API[detail.type],
    discount: amount(detail.discount_percent) ?? 0,
    categorySlug: detail.categories[0]?.slug ?? business?.categorySlug ?? "",
    businessSlug: detail.business.slug,
    areaName,
    areaSlug: elsewhere ? slugify(areaName) : (business?.areaSlug ?? ""),
    offerText: detail.description || detail.headline || detail.title,
    validFrom: day(detail.starts_at),
    createdAt: day(detail.created_at),
    timings: timings(detail),
    address: elsewhere
      ? [...new Set(branches.map((b) => b.area || b.name)), city].join(", ")
      : (business?.address ?? [detail.business.area, detail.business.city].filter(Boolean).join(", ")),
    validAt: branches.length > 1 || elsewhere ? branches.map(branchLabel) : [],
    branches: branches.map((b) => ({ id: b.id, name: b.name, areaName: b.area || b.city || "Rajkot", isMain: b.is_main, ...(branchGeo(b) ? { geo: branchGeo(b) } : {}) })),
    ...(elsewhere && branchGeo(branches[0]) ? { geo: branchGeo(branches[0]) } : {}),
    steps: STEPS[detail.redemption_mode].map((text) => ({ text })),
    terms: (detail.terms ?? "").split("\n").map((t) => t.trim()).filter(Boolean),
    redemptionMode: detail.redemption_mode,
  };
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** "9:30", "09:30" or "09:30:00" → "09:30"; anything else → null. */
function hhmm(value: unknown) {
  const match = typeof value === "string" ? value.trim().match(/^(\d{1,2}):(\d{2})/) : null;
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

/** A day's first opening in any of the stored shapes (see `BusinessHours`); null when closed. */
function firstOpening(value: unknown) {
  const first = Array.isArray(value) ? value[0] : value;
  const [open, close] =
    typeof first === "string"
      ? first.split(/\s*[-–]\s*/)
      : first && typeof first === "object"
        ? [(first as Record<string, unknown>).open, (first as Record<string, unknown>).close]
        : [];
  const opens = hhmm(open);
  const closes = hhmm(close);
  return opens && closes ? { opens, closes } : null;
}

function toHours(hours: BusinessHours | null): OpeningHours[] {
  // "monday" and "mon" both name Monday.
  const byDay = new Map(Object.entries(hours ?? {}).map(([key, value]) => [key.slice(0, 3).toLowerCase(), value]));
  return DAY_KEYS.map((key, day) => ({ day, opens: null, closes: null, ...firstOpening(byDay.get(key)) }));
}

/** "https://instagram.com/samplecafe" → "samplecafe"; masked links give nothing. */
function instagramHandle(url: string | undefined) {
  if (!url || url.includes("•")) return undefined;
  return url.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "") || undefined;
}

const RAJKOT = { lat: 22.3039, lng: 70.8022 };

/** "12, Shivam Complex, Yagnik Road" (street only), and the same with area and city for display. */
function addressLines(address: Address | null | undefined) {
  const street = [address?.address_line1, address?.address_line2, address?.landmark].filter(Boolean).join(", ");
  const city = [address?.city || "Rajkot", address?.postal_code].filter(Boolean).join(" ");
  // The street line often already ends in the area name; don't say it twice.
  const area = address?.area && !street.toLowerCase().includes(address.area.toLowerCase()) ? address.area : undefined;
  return { street, full: [street, area, city].filter(Boolean).join(", ") };
}

function toOutlet(branch: BranchResource): Outlet {
  const lat = Number(branch.address?.latitude);
  const lng = Number(branch.address?.longitude);
  const stars = rating(branch.rating_avg, branch.rating_count);
  return {
    id: branch.id,
    name: branch.name,
    isMain: branch.is_main,
    areaName: branch.address?.area || branch.address?.city || "Rajkot",
    address: addressLines(branch.address).full,
    ...(lat && lng ? { geo: { lat, lng } } : {}),
    hours: toHours(branch.business_hours),
    ...(stars ? { rating: stars } : {}),
  };
}

export function toReview(resource: ReviewResource, outlets: Outlet[] = []): Review {
  const outlet = outlets.length > 1 ? outlets.find((o) => o.id === resource.branch_id) : undefined;
  return {
    id: resource.id,
    rating: resource.rating,
    title: resource.title ?? "",
    body: resource.body ?? "",
    author: resource.user && !resource.user.is_deleted && resource.user.name ? resource.user.name : "",
    date: day(resource.created_at),
    verified: Boolean(resource.verified_redemption),
    ...(outlet ? { outlet: outlet.name } : {}),
    scores: resource.ratings.map(({ label, score }) => ({ label, score })),
  };
}

export function toBusiness(resource: BusinessResource): Business {
  const address = resource.addresses.find((a) => a.is_primary) ?? resource.addresses[0];
  const phone = resource.phones.find((p) => p.is_primary) ?? resource.phones[0];
  const whatsapp = resource.phones.find((p) => p.is_whatsapp) ?? phone;
  const category = resource.categories.find((c) => c.is_primary) ?? resource.categories[0];
  const website = resource.links.find((l) => l.type === "website")?.url;
  const areaName = address?.area || address?.city || "Rajkot";
  const { street, full } = addressLines(address);
  const cover = resource.cover?.url ?? resource.gallery[0]?.url ?? FALLBACK_IMAGE;
  return {
    id: resource.id,
    slug: resource.slug,
    name: resource.name,
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "",
    areaSlug: slugify(areaName),
    areaName,
    cover,
    ...(resource.logo?.url ? { logo: resource.logo.url } : {}),
    about: resource.description || resource.tagline || "",
    address: full,
    streetAddress: street,
    postalCode: address?.postal_code ?? "",
    phone: phone?.full_number ?? "",
    whatsapp: whatsapp?.full_number ?? "",
    contactMasked: resource.is_contact_masked,
    instagram: instagramHandle(resource.links.find((l) => l.type === "instagram")?.url),
    website: website && !website.includes("•") ? website : undefined,
    hours: toHours(resource.business_hours),
    outlets: [...(resource.branches ?? [])].sort((a, b) => Number(b.is_main) - Number(a.is_main)).map(toOutlet),
    photos: resource.gallery.length ? resource.gallery.map((m) => m.url) : [cover],
    geo: {
      lat: Number(address?.latitude) || RAJKOT.lat,
      lng: Number(address?.longitude) || RAJKOT.lng,
    },
  };
}

export function toBusinessSummary(card: BusinessCard): BusinessSummary {
  const photo = card.cover_url || card.cover_thumb_url;
  const image = photo || card.logo_url;
  const stars = rating(card.rating_avg, card.rating_count);
  return {
    id: card.id,
    slug: card.slug,
    name: card.name,
    ...(card.tagline ? { tagline: card.tagline } : {}),
    ...(card.category ? { categoryName: card.category.name } : {}),
    ...(card.city ? { city: card.city } : {}),
    ...(image ? { image } : {}),
    ...(image && !photo ? { imageIsLogo: true } : {}),
    verified: card.is_verified,
    ...(stars ? { rating: stars } : {}),
  };
}

export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toArea(area: AreaCount): Area & { offerCount: number } {
  return { slug: area.slug, name: area.name, offerCount: area.promotions_count };
}

// Category artwork: the API has no images for the offer categories yet.

const FALLBACK_IMAGE = img("photo-1441986300917-64674bd600d8", 800);

const ART: { match: RegExp; image: string }[] = [
  { match: /restaurant|cafe|bakery|food|sweets|farsan/, image: img("photo-1504674900247-0877df9cc836", 600) },
  { match: /apparel|wear|footwear|bag|jewel|watch/, image: img("photo-1441986300917-64674bd600d8", 600) },
  { match: /salon|spa|beauty|health|wellness/, image: img("photo-1560066984-138dadb4c035", 600) },
  { match: /electronic|mobile|appliance/, image: img("photo-1505740420928-5e560c06d30e", 600) },
  { match: /fitness|gym|yoga|sport/, image: img("photo-1534438327276-14e5300c3a48", 600) },
  { match: /home|living|grocery|daily/, image: img("photo-1555041469-a586c61ea9bc", 600) },
  { match: /entertainment|cinema|gaming/, image: img("photo-1489599849927-2ee91cede3ba", 600) },
  { match: /service|automobile|education|coaching|travel/, image: img("photo-1581578731548-c64695cc6952", 600) },
  { match: /gift|toy|book/, image: img("photo-1513885535751-8b9238bd345a", 600) },
];

// One icon per kind of shop, most specific first ("fast-food" before "food", "home-services" before "home").
const ICONS: { match: RegExp; icon: CategoryIcon }[] = [
  { match: /fast-food|street-food/, icon: "pizza" },
  { match: /cafe|bakery/, icon: "coffee" },
  { match: /sweets|farsan/, icon: "candy" },
  { match: /restaurant|dining|food/, icon: "utensils" },
  { match: /footwear|bag/, icon: "shopping-bag" },
  { match: /jewel|watch/, icon: "gem" },
  { match: /apparel|wear|boutique|fashion/, icon: "shirt" },
  { match: /salon|spa|beauty/, icon: "scissors" },
  { match: /health|wellness/, icon: "heart-pulse" },
  { match: /electronic|mobile|appliance/, icon: "smartphone" },
  { match: /fitness|gym|yoga|sport/, icon: "dumbbell" },
  { match: /service/, icon: "wrench" },
  { match: /grocery|daily/, icon: "shopping-basket" },
  { match: /home|living/, icon: "sofa" },
  { match: /entertainment|cinema|gaming/, icon: "ticket" },
  { match: /automobile|car-|vehicle/, icon: "car" },
  { match: /education|coaching/, icon: "graduation-cap" },
  { match: /travel|stay|hotel/, icon: "plane" },
  { match: /gift|toy|book/, icon: "gift" },
];

function art(slug: string) {
  const image = ART.find((a) => a.match.test(slug))?.image ?? FALLBACK_IMAGE;
  const icon = ICONS.find((i) => i.match.test(slug))?.icon ?? "gift";
  return { icon, image };
}

/** A category chip → the site's `Category` (+ count). The first `homeRow` categories with offers show on the home page. */
export function toCategory(chip: CategoryChip, subcategories: Category["subcategories"] = []): Category & { offerCount: number } {
  const { icon, image } = art(chip.slug);
  const short = chip.name.split(/ & | and /)[0];
  return {
    slug: chip.slug,
    name: chip.name,
    shortName: short.length <= 16 ? short : chip.name,
    icon,
    image,
    description: `Offers on ${chip.name.toLowerCase()} in Rajkot`,
    subcategories,
    inHomeRow: chip.promotions_count > 0,
    offerCount: chip.promotions_count,
  };
}
