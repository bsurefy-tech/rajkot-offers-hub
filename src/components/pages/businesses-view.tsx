import type { Metadata } from "next";
import { Suspense } from "react";
import { PageMarker } from "@/components/analytics/page-marker";
import { TrackSearch } from "@/components/analytics/track-search";
import { BusinessesExplorer } from "@/components/businesses/businesses-explorer";
import { BusinessesSkeleton } from "@/components/businesses/businesses-skeleton";
import { Container, PageTitle } from "@/components/layout/container";
import { SearchBar } from "@/components/marketing/search-bar";
import { parseBusinessFilters } from "@/lib/business-filters";
import { getAreas, getBusinesses, getCategories, getNear } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { breadcrumbLd, JsonLd, pageMetadata } from "@/lib/seo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function businessesMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Shops in Rajkot"),
    description: t("Local shops, cafés and salons in Rajkot with live offers: search by category and area, then see their offers, timings and directions."),
    path: "/businesses",
  });
}

/** The shops list for all of Rajkot, narrowed by search, category and area. */
export function BusinessesView({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Container className="pt-6 pb-10 lg:pt-12 lg:pb-20">
      <Suspense fallback={<BusinessesSkeleton />}>
        <BusinessesContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function BusinessesContent({ searchParams }: { searchParams: SearchParams }) {
  const t = await getT();
  const filters = { ...parseBusinessFilters(await searchParams), near: await getNear() };
  const [result, categories, areas] = await Promise.all([getBusinesses(filters), getCategories(), getAreas()]);

  const title = t(result.total === 1 ? "{count} shop in Rajkot" : "{count} shops in Rajkot", { count: result.total });
  return (
    <>
      <PageMarker type="shops" category={filters.category} area={filters.area} />
      {filters.q && <TrackSearch q={filters.q} results={result.total} />}
      <JsonLd data={await breadcrumbLd([{ name: t("Home"), path: "/" }, { name: t("Shops"), path: "/businesses" }])} />
      <div className="mb-2 flex flex-col gap-6 lg:mb-10 lg:items-center lg:gap-8">
        <PageTitle title={title} className="text-center" />
        <SearchBar variant="pageLarge" defaultValue={filters.q} action="/businesses" placeholder={t("Search for a shop")} className="hidden w-[560px] max-w-full lg:flex" />
      </div>
      <BusinessesExplorer basePath="/businesses" filters={filters} result={result} categories={categories} areas={areas} />
    </>
  );
}
