import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/layout/page-skeleton";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Store, Tag } from "lucide-react";
import { Link } from "@/components/i18n/link";
import { ShopAvatar } from "@/components/businesses/avatar";
import { StickyActionBar } from "@/components/businesses/contact-actions";
import { OutletSideCards } from "@/components/businesses/outlets";
import { OutletMap, type MapOutlet } from "@/components/businesses/outlet-map";
import { PhotoMosaic } from "@/components/businesses/photo-mosaic";
import { Breadcrumb, Container, SectionHeader } from "@/components/layout/container";
import { OfferCarousel } from "@/components/offers/offer-card";
import { OfferCode } from "@/components/offers/offer-code";
import { BusinessRow, HowToGetSteps, TermsAccordion } from "@/components/offers/offer-sections";
import { ReviewList } from "@/components/offers/reviews";
import { SaveBarButton, SaveTextButton } from "@/components/offers/save-button";
import { ShareButton } from "@/components/offers/share-button";
import { StoreButton } from "@/components/offers/store-button";
import { PageMarker } from "@/components/analytics/page-marker";
import { TrackOfferView } from "@/components/offers/track";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/ui/display";
import { RatingInline } from "@/components/ui/rating";
import { BackLink } from "@/components/layout/back-link";
import { SectionTabs } from "@/components/ui/section-tabs";
import { getBusiness, getCategory, getOffer, getOfferReviews, getSimilarOffers } from "@/lib/data";
import { formatRange, formatRupees } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getLocale, getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/translate";
import { breadcrumbLd, JsonLd, offerLd, pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { offerPath, shopPath } from "@/lib/paths";
import type { Offer } from "@/types";

/** The sentence search results show under the offer: what it is, where, and until when. */
function offerSummary(t: T, locale: Locale, offer: Offer) {
  return t("{offer} at {business}, {area}, Rajkot. Valid {dates}. See timings, terms and directions.", {
    offer: offer.title,
    business: offer.businessName,
    area: offer.areaName,
    dates: formatRange(offer.validFrom, offer.validTo, locale),
  });
}

export async function offerMetadata(slug: string): Promise<Metadata> {
  const [t, locale, offer] = await Promise.all([getT(), getLocale(), getOffer(slug)]);
  if (!offer) notFound();
  const vars = { offer: offer.title, business: offer.businessName, area: offer.areaName };
  return pageMetadata({
    title: t("{offer} at {business}, {area}", vars),
    description: offerSummary(t, locale, offer),
    path: offerPath(offer),
    image: offer.images[0],
    // An ended offer stays reachable for old links but should not show up in search.
    noindex: offer.isExpired,
  });
}

async function OfferContent({ slug }: { slug: string }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const offer = await getOffer(slug);
  if (!offer) notFound();
  const [business, category, similar, reviews] = await Promise.all([
    getBusiness(offer.businessSlug),
    getCategory(offer.categorySlug),
    getSimilarOffers(offer),
    getOfferReviews(offer.id),
  ]);
  if (!business) notFound();

  const expired = offer.isExpired;
  const validity = `${formatRange(offer.validFrom, offer.validTo, locale)}${expired ? ` · ${t("Expired")}` : ""}`;
  const path = offerPath(offer);
  const geo = offer.geo ?? business.geo;
  const minSpend = offer.minSpend ? t("On bills of {amount} or more", { amount: formatRupees(offer.minSpend) }) : null;
  const images = [...new Set(offer.images)];
  const hasCode = !expired && offer.redemptionMode !== "walk_in";

  const badge = (
    <Badge variant={expired ? "expired" : "offer"} size="md">
      {expired ? t("Expired") : offer.badge}
    </Badge>
  );

  // One pin per outlet the offer is valid at; without that list, the shop's own outlets, else its address.
  const valid = offer.branches.filter((b) => b.geo);
  const several = valid.length > 1;
  const pins: MapOutlet[] = valid.length
    ? valid.map((b, i) => ({ id: b.id, name: several ? b.name : business.name, address: b.areaName, lat: b.geo!.lat, lng: b.geo!.lng, main: b.isMain, ...(several ? { number: i + 1 } : {}) }))
    : [{ id: business.id, name: business.name, address: offer.address, lat: geo.lat, lng: geo.lng, main: true }];
  if (!pins.some((pin) => pin.main)) pins[0] = { ...pins[0], main: true };

  // The Outlets tab (phone) lists the outlets the offer is valid at, else all of the shop's.
  const validIds = new Set(offer.branches.map((b) => b.id));
  const matched = business.outlets.filter((o) => validIds.has(o.id));
  const outlets = matched.length ? matched : business.outlets;

  const crumbs = await breadcrumbLd([
    { name: t("Home"), path: "/" },
    { name: t("Offers"), path: "/offers" },
    ...(category ? [{ name: category.shortName, path: `/offers/${category.slug}` }] : []),
    { name: offer.title, path },
  ]);

  const mobileButtons = (
    <div className={cn("absolute inset-x-4 top-4 flex items-center justify-between lg:hidden", expired && "[&>span]:opacity-80")}>
      <BackLink fallbackHref="/offers" variant="floating" />
      {badge}
    </div>
  );

  const details = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5">
        <DetailRow icon={Tag} label={t("Offer")}>
          {offer.offerText}
          {minSpend && <span className="mt-1 block font-semibold">{minSpend}</span>}
        </DetailRow>
        <DetailRow icon={CalendarDays} label={t("Validity")}>
          {validity}
        </DetailRow>
        <DetailRow icon={Clock} label={t("Timings")}>
          {offer.timings}
        </DetailRow>
        <DetailRow icon={MapPin} label={t("Address")} className="max-lg:hidden">
          {offer.address}
        </DetailRow>
        {offer.validAt.length > 0 && (
          <DetailRow icon={Store} label={t("Valid at")}>
            <ul>
              {offer.validAt.map((branch) => (
                <li key={branch}>{branch}</li>
              ))}
            </ul>
          </DetailRow>
        )}
      </div>
    </div>
  );

  return (
    <div className="lg:bg-surface lg:pt-6 lg:pb-16">
      <JsonLd data={await offerLd(offer, business, offerSummary(t, locale, offer))} />
      <PageMarker type="offer" shop={business.slug} category={offer.categorySlug} area={business.areaSlug} />
      {!expired && <TrackOfferView offerId={offer.id} />}
      <JsonLd data={crumbs} />
      {expired && (
        <div role="status" className="bg-surface px-4 py-3 text-center text-body-sm font-medium text-muted lg:mb-6 lg:rounded-2xl">
          {t("This offer has ended")}
        </div>
      )}

      <Container className="px-0 lg:px-5">
        <div className="hidden lg:mb-4 lg:block">
          <Breadcrumb
            items={[
              { href: "/", label: t("Home") },
              { href: "/offers", label: t("Offers") },
              ...(category ? [{ href: `/categories/${category.slug}`, label: category.shortName }] : []),
            ]}
          />
        </div>
        <div className="overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-white">
          <PhotoMosaic images={images} alt={offer.title} linked={false}>
            <div className={cn("absolute bottom-4 left-4 hidden lg:block", expired && "opacity-80")}>{badge}</div>
            {mobileButtons}
          </PhotoMosaic>
          <div className="flex flex-col gap-3 px-4 pt-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8 lg:py-6">
            <div className="flex min-w-0 items-start gap-4 lg:items-center">
                            <ShopAvatar logo={business.logo} className="hidden size-20 shrink-0 lg:flex" />
              <div className="min-w-0">
                <div className="flex items-baseline gap-x-3">
                  <h1 className={cn("min-w-0 text-heading leading-snug font-semibold lg:text-page lg:leading-tight", expired && "text-muted")}>{offer.title}</h1>
                  {offer.rating && <RatingInline rating={offer.rating} className="shrink-0 self-center text-body-sm text-muted" />}
                </div>
                {/* On a phone the bottom bar's Store button leads to the shop, so only desktop names it here. */}
                <p className="mt-1 hidden flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted lg:flex">
                  <Link href={shopPath(business.slug)} className="font-medium text-ink hover:underline">
                    {business.name}
                  </Link>
                  <span aria-hidden>•</span>
                  <span>{t("{area}, Rajkot", { area: offer.areaName })}</span>
                </p>
                <p className="mt-2 text-caption leading-relaxed text-primary">
                  {t("Every offer is checked by our team before it goes live. Please verify the details before you buy.")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>

      <Container className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <div className="mt-3 flex min-w-0 flex-col gap-6 lg:mt-6 lg:gap-8 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:pb-8">
          <SectionTabs
            label={t("Page sections")}
            topBar={
              <div className="flex h-full items-center justify-between gap-1 border-b border-line px-2">
                <BackLink fallbackHref="/offers" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-title leading-tight font-semibold">{offer.title}</p>
                    {offer.rating && <RatingInline rating={offer.rating} className="shrink-0 text-caption text-muted" />}
                  </div>
                  <p className="truncate text-caption leading-tight text-muted">
                    {[business.name, business.categoryName, offer.areaName].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>
            }
            items={[
              { value: "details", label: t("Details"), content: details },
              { value: "how", label: t("How to get it"), content: <HowToGetSteps steps={offer.steps} /> },
              ...(offer.terms.length
                ? [{ value: "terms", label: t("Terms"), content: <TermsAccordion terms={offer.terms} /> }]
                : []),
              {
                value: "outlets",
                label: t(outlets.length > 1 ? "Outlets ({count})" : "Outlet ({count})", { count: outlets.length }),
                content: (
                  <div className="flex flex-col gap-4">
                    <OutletSideCards outlets={outlets} contact={business} path={shopPath(business.slug)} storeHref={shopPath(business.slug)} />
                  </div>
                ),
                // On desktop the map and address sit in the side column.
                className: "lg:hidden",
              },
              ...(reviews.total
                ? [
                    {
                      value: "reviews",
                      label: t("Reviews ({count})", { count: reviews.total }),
                      content: (
                        <ReviewList reviews={reviews.items} total={reviews.total} />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>

        {/* Desktop side cards; on a phone the same information sits in the tabs. */}
        <aside className="mt-6 hidden flex-col gap-6 lg:flex">
          {/* Validity, timings and minimum spend are in the Details tab; only the code needs its own card. */}
          {hasCode && <OfferCode offerId={offer.id} mode={offer.redemptionMode} />}
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            <OutletMap outlets={pins} className="h-[220px]" />
            <div className="flex flex-col gap-1 p-6">
              <p className="text-body leading-relaxed font-medium">{offer.address}</p>
              {offer.validAt.length > 0 && (
                <ul className="text-body-sm text-muted">
                  {offer.validAt.map((branch) => (
                    <li key={branch}>{branch}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-6">
            <BusinessRow slug={business.slug} name={business.name} area={offer.areaName} logo={business.logo} />
          </section>
        </aside>
      </Container>

      {similar.length > 0 && (
        <section className="mt-10 bg-surface py-8 lg:mt-16 lg:py-0">
          <Container>
            <SectionHeader title={t("Similar offers")} />
            <OfferCarousel offers={similar} />
          </Container>
        </section>
      )}

      {/* Desktop: save and share float at the bottom centre while the page scrolls. */}
      <div className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-float lg:flex">
        <ShareButton title={offer.title} path={path} variant="pill" offerId={offer.id} />
        <SaveTextButton slug={offer.slug} variant="outline" />
      </div>

      {/* Room for the mobile action bar. */}
      <div aria-hidden className={cn("lg:hidden", hasCode ? "h-40" : "h-24")} />
      <StickyActionBar
        lead={
          <>
            <StoreButton shop={business.slug} href={shopPath(business.slug)} name={business.name} outlets={business.outlets.map(({ id, name, address, isMain }) => ({ id, name, address, isMain }))} />
            <SaveBarButton slug={offer.slug} variant="outline" />
            <ShareButton title={offer.title} path={path} variant="bar" offerId={offer.id} />
          </>
        }
      >
        {/* A code sits above the buttons so it stays in reach while the page scrolls. */}
        {hasCode && <OfferCode offerId={offer.id} mode={offer.redemptionMode} compact />}
      </StickyActionBar>
    </div>
  );
}

export function OfferDetailView({ slug }: { slug: string }) {
  return (
    <Suspense fallback={<DetailSkeleton kind="offer" />}>
      <OfferContent slug={slug} />
    </Suspense>
  );
}
