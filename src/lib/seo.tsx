import type { Metadata } from "next";
import { languageSwitchEnabled, localizePath, type Locale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { absoluteUrl, site } from "@/lib/site";
import type { Business, Offer, OpeningHours, Rating, Review } from "@/types";
import { offerPath, shopPath } from "@/lib/paths";

/**
 * public/opengraph-image.png, named by every page. Not the `app/opengraph-image`
 * file convention: that never reaches pages under the `[lang]` root layout, and
 * `app/` itself has no layout to set `metadataBase`, so Next warned and resolved
 * it against http://localhost:3000 on every build and worker start.
 */
export const DEFAULT_SHARE_IMAGE = "/opengraph-image.png";

interface PageSeo {
  title: string;
  description: string;
  /** Public path without the locale prefix; becomes the canonical URL. */
  path: string;
  /** Share image; the site-wide one when omitted. */
  image?: string;
  /** Keep the page out of search results (empty lists, expired offers). */
  noindex?: boolean;
  /** Use `title` as is, without the "· Rajkot Offers Hub" suffix. */
  absoluteTitle?: boolean;
}

/** Titles beyond ~60 characters are cut off in search results; the brand suffix is the first thing to give up. */
const TITLE_BUDGET = 60;

/** Descriptions are cut off in search results at about 160 characters; cut at a word instead of mid-word. */
const DESCRIPTION_BUDGET = 160;

export function clip(text: string, max = DESCRIPTION_BUDGET) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max / 2)).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

/**
 * Title, description, canonical URL and share tags for a page. Pages pass the
 * clean path, so filtered and sorted variants ("?sort=ending", "?page=2") point
 * search engines back to the one URL that should rank.
 */
export async function pageMetadata({ title, description, path, image, noindex, absoluteTitle }: PageSeo): Promise<Metadata> {
  const locale = await getLocale();
  const url = localizePath(locale, path);
  const images = [image ?? DEFAULT_SHARE_IMAGE];
  const summary = clip(description);
  // A long title keeps its own words and drops "· Rajkot Offers Hub" rather than being cut mid-title.
  const bare = absoluteTitle || title.length + site.name.length + 3 > TITLE_BUDGET;
  return {
    title: bare ? { absolute: title } : title,
    description: summary,
    alternates: {
      canonical: url,
      // The Gujarati site is switched off, so /gu URLs only redirect; they join the cluster when it comes back.
      ...(languageSwitchEnabled
        ? { languages: { "en-IN": localizePath("en", path), "gu-IN": localizePath("gu", path), "x-default": localizePath("en", path) } }
        : {}),
    },
    openGraph: {
      title,
      description: summary,
      url,
      siteName: site.name,
      locale: locale === "gu" ? "gu_IN" : "en_IN",
      type: "website",
      images,
    },
    twitter: { card: "summary_large_image", title, description: summary, images },
    ...(noindex && { robots: { index: false, follow: true } }),
  };
}

/** Renders schema.org data as a JSON-LD script tag. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Escape "<" so text in the data can never close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const ORGANIZATION_ID = `${site.url}/#organization`;

/** The site itself, for the home page. */
export function siteLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: site.name,
        url: site.url,
        logo: absoluteUrl("/icon.png"),
        email: site.email,
        telephone: site.phone,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          telephone: site.phone,
          email: site.email,
          areaServed: site.country,
          availableLanguage: ["English", "Gujarati"],
        },
        sameAs: [`https://instagram.com/${site.instagram.replace(/^@/, "")}`],
        areaServed: cityLd(),
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        url: site.url,
        description,
        inLanguage: "en-IN",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

function cityLd() {
  return {
    "@type": "City",
    name: site.city,
    containedInPlace: { "@type": "State", name: site.region },
  };
}

/** Breadcrumb trail; the last item is the current page. */
export async function breadcrumbLd(items: { name: string; path: string }[]) {
  const locale = await getLocale();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(localizePath(locale, item.path)),
    })),
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

/** The closest schema.org business type for each category. */
const BUSINESS_TYPES: Record<string, string> = {
  food: "FoodEstablishment",
  fashion: "ClothingStore",
  beauty: "BeautySalon",
  electronics: "ElectronicsStore",
  fitness: "HealthClub",
  home: "HomeGoodsStore",
  entertainment: "EntertainmentBusiness",
  festival: "Store",
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Mock numbers are masked ("+91 98XXX XXXXX"); only publish real ones. */
function realPhone(phone: string) {
  return /^\+?[\d\s-]+$/.test(phone) ? phone : undefined;
}

function addressLd(business: Business) {
  return {
    "@type": "PostalAddress",
    streetAddress: business.streetAddress,
    addressLocality: `${business.areaName}, ${site.city}`,
    addressRegion: site.region,
    postalCode: business.postalCode,
    addressCountry: site.country,
  };
}

function businessRef(business: Business, locale: Locale) {
  return `${absoluteUrl(localizePath(locale, shopPath(business.slug)))}#business`;
}

function ratingLd(rating: Rating | undefined) {
  return rating ? { "@type": "AggregateRating", ratingValue: rating.avg, reviewCount: rating.count, bestRating: 5, worstRating: 1 } : undefined;
}

function hoursLd(hours: OpeningHours[]) {
  return hours
    .filter((h) => h.opens && h.closes)
    .map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[h.day], opens: h.opens, closes: h.closes }));
}

function mapLd(geo: { lat: number; lng: number }) {
  return `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`;
}

function reviewLd(review: Review) {
  return {
    "@type": "Review",
    name: review.title || undefined,
    reviewBody: review.body,
    datePublished: review.date,
    author: { "@type": "Person", name: review.author },
    reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
  };
}

/**
 * A shop's profile as a LocalBusiness: address, map pin, hours, ratings and recent reviews.
 * A shop with several outlets also gets one LocalBusiness per other outlet, tied to the shop
 * by `parentOrganization`, so each branch can be found by its own address and area.
 */
export async function localBusinessLd(
  business: Business,
  offers: Pick<Offer, "urlSlug" | "title" | "businessSlug">[] = [],
  rating?: Rating,
  reviews: Review[] = [],
) {
  const locale = await getLocale();
  const url = absoluteUrl(localizePath(locale, shopPath(business.slug)));
  const type = BUSINESS_TYPES[business.categorySlug] ?? "LocalBusiness";
  const id = businessRef(business, locale);
  const links = [
    business.instagram && `https://instagram.com/${business.instagram.replace(/^@/, "")}`,
    business.website && (business.website.startsWith("http") ? business.website : `https://${business.website}`),
  ].filter(Boolean);

  const main = {
    "@type": type,
    "@id": id,
    name: business.name,
    description: business.about,
    url,
    image: [...new Set([business.cover, ...business.photos])],
    logo: business.logo,
    telephone: realPhone(business.phone),
    aggregateRating: ratingLd(rating),
    review: reviews.length ? reviews.slice(0, 5).map(reviewLd) : undefined,
    address: addressLd(business),
    geo: { "@type": "GeoCoordinates", latitude: business.geo.lat, longitude: business.geo.lng },
    hasMap: mapLd(business.geo),
    openingHoursSpecification: hoursLd(business.hours),
    areaServed: cityLd(),
    sameAs: links.length ? links : undefined,
    makesOffer: offers.length
      ? offers.map((o) => ({ "@type": "Offer", name: o.title, url: absoluteUrl(localizePath(locale, offerPath(o))) }))
      : undefined,
  };

  // The main outlet is the shop itself above; each other outlet is a branch with its own place and hours.
  const branches = business.outlets
    .filter((o) => !o.isMain)
    .map((o) => ({
      "@type": type,
      "@id": `${url}#outlet-${o.id}`,
      name: `${business.name}, ${o.name}`,
      url,
      parentOrganization: { "@id": id },
      address: {
        "@type": "PostalAddress",
        streetAddress: o.address,
        addressLocality: `${o.areaName}, ${site.city}`,
        addressRegion: site.region,
        addressCountry: site.country,
      },
      geo: o.geo ? { "@type": "GeoCoordinates", latitude: o.geo.lat, longitude: o.geo.lng } : undefined,
      hasMap: o.geo ? mapLd(o.geo) : undefined,
      openingHoursSpecification: hoursLd(o.hours),
      aggregateRating: ratingLd(o.rating),
      areaServed: cityLd(),
    }));

  return { "@context": "https://schema.org", "@graph": [main, ...branches] };
}

/**
 * The API fills a missing offer description with "Valid at <shop> on the dates shown.",
 * which says nothing the page does not already. Anything else is the shop's own words.
 */
export function ownDescription(offer: Pick<Offer, "title" | "offerText">) {
  const text = offer.offerText.trim();
  return text && text !== offer.title && !/^valid at .+ on the dates shown\.?$/i.test(text) ? text : undefined;
}

/** One offer, made by the business that runs it. `description` is the sentence search results show for the page. */
export async function offerLd(offer: Offer, business: Business, description: string) {
  const locale = await getLocale();
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.title,
    description: ownDescription(offer) ?? description,
    url: absoluteUrl(localizePath(locale, offerPath(offer))),
    image: offer.images,
    category: offer.subcategory,
    validFrom: offer.validFrom,
    validThrough: offer.validTo,
    availabilityStarts: offer.validFrom,
    availabilityEnds: offer.validTo,
    availability: offer.isExpired ? "https://schema.org/Discontinued" : "https://schema.org/InStoreOnly",
    areaServed: cityLd(),
    eligibleRegion: cityLd(),
    aggregateRating: ratingLd(offer.rating),
    seller: {
      "@type": BUSINESS_TYPES[business.categorySlug] ?? "LocalBusiness",
      "@id": businessRef(business, locale),
      name: business.name,
      address: addressLd(business),
    },
  };
}

/** A page that lists things (offers, categories): a CollectionPage whose main entity is the list. */
export async function collectionLd({
  name,
  description,
  path,
  items,
}: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string; image?: string }[];
}) {
  const locale = await getLocale();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(localizePath(locale, path)),
    isPartOf: { "@id": `${site.url}/#website` },
    about: cityLd(),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: absoluteUrl(localizePath(locale, item.path)),
        image: item.image,
      })),
    },
  };
}
