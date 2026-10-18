import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageMarker } from "@/components/analytics/page-marker";
import { TrackSearch } from "@/components/analytics/track-search";
import { Container, PageTitle } from "@/components/layout/container";
import { SearchBar } from "@/components/marketing/search-bar";
import { AreaLinks } from "@/components/offers/area-links";
import { FollowedOffers } from "@/components/offers/followed-offers";
import { OffersExplorer } from "@/components/offers/offers-explorer";
import { OffersSkeleton } from "@/components/offers/offers-skeleton";
import { getArea, getCategories, getCategory, getNear, getOffers } from "@/lib/data";
import { offersPath } from "@/lib/areas";
import { filtersToQuery, parseFilters } from "@/lib/filters";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/translate";
import { breadcrumbLd, collectionLd, JsonLd, pageMetadata } from "@/lib/seo";
import { offerPath } from "@/lib/paths";
import type { Area, Category } from "@/types";
import { resolveArea } from "./resolve-area";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** What the list is called and how search results describe it. */
function listCopy(t: T, area?: Area, category?: Category) {
  if (category) {
    return area
      ? {
          title: t("{category} offers in {area}, Rajkot", { category: category.shortName, area: area.name }),
          description: t("Live {category} offers in {area}, Rajkot: discounts and deals from nearby shops, with timings, terms and directions.", {
            category: category.shortName,
            area: area.name,
          }),
        }
      : {
          title: t("{category} offers in Rajkot", { category: category.shortName }),
          description: t("Live {category} offers in Rajkot: discounts and deals from local shops, with timings, terms and directions.", {
            category: category.shortName,
          }),
        };
  }
  return area
    ? {
        title: t("Offers in {area}, Rajkot", { area: area.name }),
        description: t(
          "Live offers in {area}, Rajkot: food, fashion, beauty and more. Search by category and offer type, then see timings, terms and directions.",
          { area: area.name },
        ),
      }
    : {
        title: t("Offers and discounts in Rajkot"),
        description: t("All live offers in Rajkot: search by area, category and offer type."),
      };
}

export async function offersMetadata(areaSlug?: string, categorySlug?: string): Promise<Metadata> {
  const t = await getT();
  const [area, category] = await Promise.all([
    areaSlug ? getArea(areaSlug) : undefined,
    categorySlug ? getCategory(categorySlug) : undefined,
  ]);
  if ((areaSlug && !area) || (categorySlug && !category)) notFound();

  // Lists with nothing live are thin pages: keep them out of search until they fill up.
  const { total } = await getOffers({ areas: area ? [area.slug] : undefined, category: category?.slug });
  return pageMetadata({
    ...listCopy(t, area, category),
    path: offersPath(area?.slug, category?.slug),
    image: category?.image,
    // The all-Rajkot list stays indexable even when empty: it is the site's main page for "offers in Rajkot".
    noindex: total === 0 && Boolean(area || category),
  });
}

/**
 * The offers list for all of Rajkot or one area, optionally narrowed to one
 * category. Area and category both come from the URL path.
 */
export async function OffersView({
  area: areaSlug,
  category: categorySlug,
  searchParams,
}: {
  area?: string;
  category?: string;
  searchParams: SearchParams;
}) {
  const area = await resolveArea(areaSlug);
  const category = categorySlug ? await getCategory(categorySlug) : undefined;
  if (categorySlug && !category) notFound();

  return (
    <Container className="pt-6 pb-10 lg:pt-12 lg:pb-20">
      {/* Shops the visitor follows come first, on the all-Rajkot list. */}
      {!areaSlug && !categorySlug && <FollowedOffers className="mb-8 lg:mb-12" />}
      <Suspense fallback={<OffersSkeleton subtitle={Boolean(areaSlug || categorySlug)} />}>
        <OffersContent area={area} category={category} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function OffersContent({
  area,
  category,
  searchParams,
}: {
  area?: Area;
  category?: Category;
  searchParams: SearchParams;
}) {
  const t = await getT();
  // The area and category live in the path, so they are not part of the query filters.
  const filters = { ...parseFilters(await searchParams), areas: area ? [area.slug] : undefined, near: await getNear() };
  const [result, categories, liveCount] = await Promise.all([
    getOffers({ ...filters, category: category?.slug }),
    getCategories(area?.slug),
    getOffers({ areas: filters.areas, category: category?.slug }).then((r) => r.total),
  ]);

  // Switching category keeps the search, type, validity and sort, but not the sub-category.
  const chipQuery = filtersToQuery({ ...filters, subcategory: undefined });
  const categoryOptions = [
    { label: t("All"), href: `${offersPath(area?.slug)}${chipQuery}`, selected: !category },
    // Categories with live offers here, plus the one being viewed even when it has none.
    ...categories.filter((c) => c.offerCount > 0 || c.slug === category?.slug).map((c) => ({
      label: c.shortName,
      href: `${offersPath(area?.slug, c.slug)}${chipQuery}`,
      selected: category?.slug === c.slug,
    })),
  ];

  const basePath = offersPath(area?.slug, category?.slug);
  const subtitle = area
    ? t(liveCount === 1 ? "{count} live offer in {area}" : "{count} live offers in {area}", { count: liveCount, area: area.name })
    : t(liveCount === 1 ? "{count} live offer in Rajkot" : "{count} live offers in Rajkot", { count: liveCount });

  const copy = listCopy(t, area, category);
  const clean = !filtersToQuery(filters) && !filters.page;
  const crumbs = [
    { name: t("Home"), path: "/" },
    { name: t("Offers"), path: "/offers" },
    ...(area ? [{ name: area.name, path: offersPath(area.slug) }] : []),
    ...(category ? [{ name: category.shortName, path: basePath }] : []),
  ];

  return (
    <>
      <PageMarker type="offers" category={category?.slug} area={area?.slug} />
      {filters.q && <TrackSearch q={filters.q} results={result.total} />}
      <JsonLd data={await breadcrumbLd(crumbs)} />
      {/* The clean list only: a search or sorted variant names it as its canonical page. */}
      {clean && result.items.length > 0 && (
        <JsonLd
          data={await collectionLd({
            name: copy.title,
            description: copy.description,
            path: basePath,
            items: result.items.map((offer) => ({ name: offer.title, path: offerPath(offer), image: offer.images[0] })),
          })}
        />
      )}
      <div className="mb-2 flex flex-col gap-6 lg:mb-10 lg:items-center lg:gap-8">
        <PageTitle
          // All of Rajkot has no name of its own to give: the live count is the heading.
          title={category?.name ?? (area ? t("Offers in {area}", { area: area.name }) : subtitle)}
          subtitle={category || area ? subtitle : undefined}
          className="text-center"
        />
        <SearchBar variant="pageLarge" defaultValue={filters.q} action={basePath} className="hidden w-[560px] max-w-full lg:flex" />
      </div>
      <OffersExplorer
        basePath={basePath}
        category={category?.slug}
        filters={filters}
        result={result}
        scope={{ label: t("Category"), options: categoryOptions }}
        withSearch
      />
      <Suspense fallback={null}>
        <AreaLinks area={area} category={category} />
      </Suspense>
    </>
  );
}
