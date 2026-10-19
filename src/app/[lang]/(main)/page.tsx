import type { Metadata } from "next";
import { Suspense } from "react";
import { AreaPills, CategoryIconRow } from "@/components/categories/category-tiles";
import { Section, SectionHeader } from "@/components/layout/container";
import { ALTERNATING_SECTIONS, HomeSectionsSkeleton } from "@/components/layout/page-skeleton";
import { BusinessCta } from "@/components/marketing/promos";
import { HeroSlider } from "@/components/marketing/hero-slider";
import { FollowedOffers } from "@/components/offers/followed-offers";
import { OfferCarousel, OfferGrid } from "@/components/offers/offer-card";
import { ButtonLink } from "@/components/ui/button";
import { getAreas, getCategories, getFeaturedOffers, getHeroSlides, getLatestOffers, getTodayOffers } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { img } from "@/lib/mock/images";
import { JsonLd, pageMetadata, siteLd } from "@/lib/seo";
import { site } from "@/lib/site";
import { NearYou } from "@/components/offers/near-you";
import { StatusRow } from "@/components/zalak/status-row";
import { ZalakShelf } from "@/components/zalak/zalak-shelf";
import { getReelFeed, getStatusFeed } from "@/lib/zalak/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: `${site.name}: ${t("Offers, discounts and deals in Rajkot")}`,
    description: t("Fresh offers from Rajkot's shops, cafés and salons, all in one place."),
    path: "/",
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  const t = await getT();
  return (
    <>
      <JsonLd data={siteLd(t("Fresh offers from Rajkot's shops, cafés and salons, all in one place."))} />
      {/* The page opens straight on the offers; the heading stays for screen readers and search engines. */}
      <h1 className="sr-only">{t("What’s on offer today?")}</h1>

      {/* The offers come from the API, so they stream in. */}
      <Suspense fallback={<HomeSectionsSkeleton />}>
        <HomeSections />
      </Suspense>
    </>
  );
}

async function HomeSections() {
  const t = await getT();
  const [categories, today, latest, featured, hero, statuses, reels, areas] = await Promise.all([
    getCategories(),
    getTodayOffers(),
    getLatestOffers(),
    getFeaturedOffers(),
    getHeroSlides(),
    // Never let the new feeds take the home page down with them.
    getStatusFeed().catch(() => []),
    getReelFeed(1, 8).then((feed) => feed.stories).catch(() => []),
    getAreas().catch(() => []),
  ]);
  const homeCategories = categories.filter((c) => c.inHomeRow);

  return (
    <div className={ALTERNATING_SECTIONS}>
      {statuses.length > 0 && (
        <Section compact className="py-4 lg:py-6">
          <StatusRow stories={statuses} />
        </Section>
      )}

      {/* The banner runs edge to edge on every screen, square and with no space around it. */}
      {hero.slides.length > 0 && (
        <section>
          {/* Always loops: after the last banner it goes back to the first. */}
          <HeroSlider slides={hero.slides} ratios={hero.ratios} autoplayMs={hero.autoplayMs} loop />
        </section>
      )}

      {reels.length > 0 && (
        <Section compact>
          <SectionHeader title={t("Zalak")} href="/zalak" />
          <ZalakShelf stories={reels} />
        </Section>
      )}

      <FollowedOffers framed />

      <Section compact>
        <SectionHeader title={t("Category")} href="/categories" />
        <CategoryIconRow categories={homeCategories} />
      </Section>

      {areas.length > 0 && (
        <Section compact>
          <SectionHeader title={t("Offers by area in Rajkot")} />
          <AreaPills areas={areas} />
        </Section>
      )}

      <Suspense fallback={null}>
        <NearYou />
      </Suspense>

      <Section>
        <SectionHeader title={t("Today's offers")} href="/offers?sort=ending" />
        <OfferCarousel offers={today} />
      </Section>

      {featured.length > 0 && (
        <Section>
          <SectionHeader title={t("Featured offers")} href="/offers" />
          <OfferCarousel offers={featured} />
        </Section>
      )}

      <Section>
        <SectionHeader title={t("New offers")} />
        <OfferGrid offers={latest} />
        <div className="mt-6 flex justify-center lg:mt-10">
          <ButtonLink href="/offers" variant="outline" className="w-full lg:w-auto lg:px-7">
            {t("See all offers")}
          </ButtonLink>
        </div>
      </Section>

      <Section>
        <BusinessCta image={img("photo-1567401893414-76b7b1e5a7a5", 1200)} />
      </Section>
    </div>
  );
}
