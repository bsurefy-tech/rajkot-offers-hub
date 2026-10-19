import { api, ApiError } from "@/lib/api/client";
import type { BannerFeed } from "@/lib/api/types";
import { getOfferCard } from "./offers";
import { offerPath } from "@/lib/paths";

export interface HeroSlide {
  id: string;
  /** A path on this site. */
  href: string;
  /** One picture per screen size; missing sizes fall back to the next larger one. */
  images: { mobile: string; tablet: string; desktop: string };
  /** What the slide leads to, for the picture's description. */
  alt: string;
}

/** CSS `aspect-ratio` per screen size, as the API says the pictures were cropped. */
export interface HeroRatios {
  mobile: string;
  tablet: string;
  desktop: string;
}

export interface HeroSlides {
  slides: HeroSlide[];
  ratios: HeroRatios;
  autoplayMs: number;
  loop: boolean;
}

/** What the site used before the API sent the ratios. */
const DEFAULT_RATIOS: HeroRatios = { mobile: "16 / 9", tablet: "2 / 1", desktop: "3 / 1" };

/** "16:9" → "16 / 9"; anything else is ignored so a bad value can't collapse the banner. */
function ratio(value: string | undefined, fallback: string): string {
  const match = value?.match(/^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/);
  return match && Number(match[1]) > 0 && Number(match[2]) > 0 ? `${match[1]} / ${match[2]}` : fallback;
}

/** Root category id → slug, to open a banner's category as an offer list. */
async function rootCategories() {
  return (await api<{ data: { id: string; slug: string; name: string }[] }>("/categories")).data;
}

/**
 * Where a slide goes: an offer, a category's offers, or a page of this site.
 * Null when the target is gone or not something this site shows, so the slide is dropped.
 */
async function target(link: BannerFeed["items"][number]["link"]): Promise<{ href: string; alt: string } | null> {
  if (link.type === "none") return { href: "/offers", alt: "" };
  if (link.type === "web") {
    // Only this site's own pages: a path, never another host.
    return link.url?.startsWith("/") && !link.url.startsWith("//") ? { href: link.url, alt: "" } : null;
  }
  const { resource, id } = link.action ?? {};
  if (!id) return null;
  if (resource === "promotion") {
    const offer = await getOfferCard(id);
    return offer && !offer.isExpired ? { href: offerPath(offer), alt: offer.title } : null;
  }
  if (resource === "category") {
    const category = (await rootCategories()).find((c) => c.id === id);
    // `sub` filters by any category in the tree, so a whole branch such as "Restaurants & Food" works.
    return category ? { href: `/offers?sub=${encodeURIComponent(category.slug)}`, alt: category.name } : null;
  }
  return null;
}

/** The home page's slider. Empty when the placement has no live banners. */
export async function getHeroSlides(): Promise<HeroSlides> {
  // Pictures are a bonus: a placement the API doesn't know leaves the home page as it was.
  let feed: BannerFeed;
  try {
    feed = (await api<{ data: BannerFeed }>("/banners", { query: { placement: "home-hero" } })).data;
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) return { slides: [], ratios: DEFAULT_RATIOS, autoplayMs: 5000, loop: true };
    throw error;
  }
  const slides = (
    await Promise.all(
      feed.items.map(async (item): Promise<HeroSlide | null> => {
        const { mobile, tablet, desktop } = item.images;
        const first = mobile?.url ?? tablet?.url ?? desktop?.url;
        const where = await target(item.link);
        if (!first || !where) return null;
        return {
          id: item.id,
          href: where.href,
          alt: where.alt,
          images: { mobile: mobile?.url ?? first, tablet: tablet?.url ?? desktop?.url ?? first, desktop: desktop?.url ?? tablet?.url ?? first },
        };
      }),
    )
  ).filter((slide): slide is HeroSlide => slide !== null);
  const variants = feed.display.variants ?? {};
  const ratios: HeroRatios = {
    mobile: ratio(variants.mobile?.aspect_ratio, DEFAULT_RATIOS.mobile),
    tablet: ratio(variants.tablet?.aspect_ratio, DEFAULT_RATIOS.tablet),
    desktop: ratio(variants.desktop?.aspect_ratio, DEFAULT_RATIOS.desktop),
  };
  return { slides, ratios, autoplayMs: feed.display.autoplay_ms, loop: feed.display.loop };
}
