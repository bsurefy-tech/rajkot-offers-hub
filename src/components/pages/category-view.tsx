import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryBanner } from "@/components/categories/category-tiles";
import { Breadcrumb, Container, SectionHeader } from "@/components/layout/container";
import { MobileTopBar } from "@/components/layout/header";
import { SiteBottomNav } from "@/components/layout/bottom-nav";
import { OfferCarousel } from "@/components/offers/offer-card";
import { OffersExplorer } from "@/components/offers/offers-explorer";
import { OfferListSkeleton } from "@/components/offers/offers-skeleton";
import { offersMetadata } from "@/components/pages/offers-view";
import { ChipLink } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/display";
import { ButtonLink } from "@/components/ui/button";
import { getCategories, getCategory, getNear, getOffers } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { getT } from "@/lib/i18n/server";
import type { Area, OfferFilters } from "@/types";
import { resolveArea } from "./resolve-area";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Same offers as "/offers/<slug>" (or "/<area>/offers/<slug>"), so the same
 * metadata, with that page as the canonical URL.
 */
export function categoryMetadata(slug: string, area?: string): Promise<Metadata> {
  return offersMetadata(area, slug);
}

async function CategoryContent({ slug, area, searchParams }: { slug: string; area?: Area; searchParams: SearchParams }) {
  const t = await getT();
  const category = await getCategory(slug);
  if (!category) notFound();

  return (
    // Grey page background on a phone too, like the offers page; the shell only gives it to desktop.
    <div className="min-h-dvh bg-surface lg:min-h-0">
      <MobileTopBar title={category.name} backHref="/categories" />
      <Container className="flex flex-col gap-5 pt-4 pb-24 lg:gap-8 lg:pt-8 lg:pb-20">
        <Breadcrumb
          items={[{ href: "/", label: t("Home") }, { href: "/categories", label: t("Categories") }, { label: category.name }]}
        />
        <CategoryBanner variant="hero" title={category.name} description={category.description} image={category.image} />
        <Suspense fallback={<OfferListSkeleton />}>
          <CategoryOffers slug={category.slug} area={area} subcategories={category.subcategories} searchParams={searchParams} />
        </Suspense>
      </Container>
      <SiteBottomNav />
    </div>
  );
}

async function CategoryOffers({
  slug,
  area,
  subcategories,
  searchParams,
}: {
  slug: string;
  area?: Area;
  subcategories: { slug: string; name: string }[];
  searchParams: SearchParams;
}) {
  const t = await getT();
  // The category comes from the path, never from the query.
  const filters = { ...parseFilters(await searchParams), category: undefined, areas: area ? [area.slug] : undefined, near: await getNear() };
  const result = await getOffers({ ...filters, category: slug });

  const subcategoryOptions = subcategories.length
    ? [
        { label: t("All"), patch: { subcategory: undefined }, selected: !filters.subcategory },
        ...subcategories.map((sub) => ({ label: sub.name, patch: { subcategory: sub.slug }, selected: filters.subcategory === sub.slug })),
      ]
    : [];

  return (
    <OffersExplorer
      basePath={`/categories/${slug}`}
      filters={filters}
      result={result}
      category={slug}
      scope={{ label: t("Sub-category"), options: subcategoryOptions }}
      emptyTitle={t("No offers in this category right now")}
      emptyHint={t("Shops add new offers every day. Check back soon, or have a look at these.")}
      emptyAction={{ href: "/offers", label: t("Browse all offers") }}
      emptySuggestions={<EmptyCategorySuggestions slug={slug} filters={filters} />}
    />
  );
}

/** What to look at instead when a category has no offers: other categories with offers, live offers, and a way for shops to add theirs. */
async function EmptyCategorySuggestions({ slug, filters }: { slug: string; filters: OfferFilters }) {
  const t = await getT();
  const [categories, offers] = await Promise.all([
    getCategories(filters.areas?.[0]),
    getOffers({ areas: filters.areas, near: filters.near }),
  ]);
  const others = categories.filter((category) => category.slug !== slug && category.offerCount > 0);
  return (
    <div className="mt-4 flex flex-col gap-10 lg:mt-8 lg:gap-12">
      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-heading font-semibold">{t("Categories with offers")}</h2>
          <div className="flex flex-wrap gap-2">
            {others.map((category) => (
              <ChipLink key={category.slug} href={`/categories/${category.slug}`}>
                {category.shortName}
              </ChipLink>
            ))}
          </div>
        </section>
      )}
      {offers.items.length > 0 && (
        <section>
          <SectionHeader title={t("Live offers in Rajkot")} />
          <OfferCarousel offers={offers.items.slice(0, 8)} />
        </section>
      )}
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div>
          <h2 className="text-heading font-semibold">{t("Run a shop in this category?")}</h2>
          <p className="mt-1 text-body-sm text-muted">{t("List your shop’s offer for free and reach local customers.")}</p>
        </div>
        <ButtonLink href="/submit-offer" variant="outline" className="shrink-0">
          {t("Submit an offer")}
        </ButtonLink>
      </section>
    </div>
  );
}

/** The category page before its name is known: the phone's top bar, breadcrumb, banner and the list. */
function CategoryPageSkeleton() {
  return (
    <div aria-busy="true" className="min-h-dvh bg-surface lg:min-h-0">
      <div className="border-b border-line bg-white lg:hidden">
        <div className="grid h-14 grid-cols-[40px_1fr_40px] items-center px-2">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="ml-1 h-5 w-40" />
        </div>
      </div>
      <Container className="flex flex-col gap-5 pt-4 pb-24 lg:gap-8 lg:pt-8 lg:pb-20">
        <div className="hidden lg:block">
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-40 rounded-2xl lg:h-[280px]" />
        <OfferListSkeleton />
      </Container>
      <SiteBottomNav />
    </div>
  );
}

/** One category's offers for all of Rajkot, or for one area when `area` comes from the URL. */
export async function CategoryView({ slug, area: areaSlug, searchParams }: { slug: string; area?: string; searchParams: SearchParams }) {
  const area = await resolveArea(areaSlug);
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryContent slug={slug} area={area} searchParams={searchParams} />
    </Suspense>
  );
}
