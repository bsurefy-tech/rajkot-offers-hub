import type { MetadataRoute } from "next";
import { getAreaSlugs, getBusinessIndex, getCategories, getLiveOffers } from "@/lib/data";
import { offersPath } from "@/lib/areas";
import { toIsoDay } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";
import type { OfferSummary } from "@/types";
import { offerPath, shopPath } from "@/lib/paths";

/** A modification date is never in the future: search engines ignore those (an offer starting next week has not changed yet). */
function pastDay(day: string) {
  const today = toIsoDay(new Date());
  return day < today ? day : today;
}

/** Latest day an offer in `list` was added: a list page changes when a new offer joins it. */
function newest(list: OfferSummary[]) {
  const latest = list.reduce<string | undefined>((max, o) => (!max || o.createdAt > max ? o.createdAt : max), undefined);
  return latest && pastDay(latest);
}

/**
 * Every page worth ranking: the main pages, offer lists that have live offers
 * (all of Rajkot, each area, each category, each area × category), live offers
 * and business profiles. Empty lists and expired offers are left out; their
 * pages are also marked noindex. "/categories/<slug>" pages are left out too:
 * they show the same offers as "/offers/<slug>", which is their canonical URL.
 *
 * `lastModified` is only given where the API knows it (an offer's creation day, a
 * shop's last update, the newest offer on the home and offers pages): a made-up
 * date teaches crawlers to ignore the field.
 */
// Rendered per request: a prerendered sitemap would refresh itself in the background, which hangs on Workers.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [live, shops, areaSlugs, categories] = await Promise.all([getLiveOffers(), getBusinessIndex(), getAreaSlugs(), getCategories()]);
  const entry = (path: string, lastModified?: string, images?: string[]): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    ...(lastModified && { lastModified: pastDay(lastModified) }),
    ...(images?.length && { images }),
  });

  // Category and area × category lists, only where the API counts live offers.
  const lists: MetadataRoute.Sitemap = categories.filter((c) => c.offerCount > 0).map((c) => entry(offersPath(undefined, c.slug)));
  const perArea = await Promise.all(areaSlugs.map(async (area) => ({ area, categories: await getCategories(area) })));
  for (const { area, categories: inArea } of perArea) {
    lists.push(entry(offersPath(area)));
    for (const category of inArea) {
      if (category.offerCount > 0) lists.push(entry(offersPath(area, category.slug)));
    }
  }

  const latest = newest(live);
  return [
    entry("/", latest),
    entry("/offers", latest),
    entry("/categories"),
    entry("/how-it-works"),
    entry("/contact"),
    entry("/submit-offer"),
    entry("/privacy"),
    entry("/terms"),
    ...lists,
    ...live.map((o) => entry(offerPath(o), o.createdAt, o.images.slice(0, 1))),
    ...shops.map((shop) => entry(shopPath(shop.slug), shop.updatedAt)),
  ];
}
