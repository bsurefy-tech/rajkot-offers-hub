import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailSkeleton } from "@/components/layout/page-skeleton";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Globe, Navigation, Phone, Tag } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand";
import { ShopAvatar } from "@/components/businesses/avatar";
import { ContactRow, StickyActionBar } from "@/components/businesses/contact-actions";
import { ContactLink } from "@/components/businesses/contact-link";
import { OutletSideCards } from "@/components/businesses/outlets";
import { OutletMap, type MapOutlet } from "@/components/businesses/outlet-map";
import { PhotoMosaic } from "@/components/businesses/photo-mosaic";
import { Container } from "@/components/layout/container";
import { FollowBarButton, FollowButton } from "@/components/offers/follow-button";
import { OfferCard } from "@/components/offers/offer-card";
import { ReviewList } from "@/components/offers/reviews";
import { SaveBarButton, SaveTextButton } from "@/components/offers/save-button";
import { ShareButton } from "@/components/offers/share-button";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { DetailRow, EmptyState } from "@/components/ui/display";
import { BackLink } from "@/components/layout/back-link";
import { SectionTabs } from "@/components/ui/section-tabs";
import { offersPath } from "@/lib/areas";
import { getBusiness, getBusinessOffers, getBusinessReviews, getCategory } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import { cn, directionsHref } from "@/lib/utils";
import { breadcrumbLd, JsonLd, localBusinessLd, pageMetadata } from "@/lib/seo";
import type { Business, OfferSummary, Rating, Review } from "@/types";
import { RatingInline } from "@/components/ui/rating";
import { shopPath } from "@/lib/paths";

export async function generateMetadata({ params }: PageProps<"/[lang]/businesses/[slug]">): Promise<Metadata> {
  const [t, business] = await Promise.all([getT(), params.then((p) => getBusiness(p.slug))]);
  if (!business) notFound();
  const vars = { business: business.name, category: business.categoryName, area: business.areaName };
  return pageMetadata({
    title: t("{business}, {area}, Rajkot: offers, hours and address", vars),
    description: t("{category} • {area}, Rajkot. {about}", { ...vars, about: business.about }),
    path: shopPath(business.slug),
    image: business.cover,
  });
}

/** Icon buttons in the phone's sticky header. */
const headerAction = "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-surface";

/** The shop's Instagram and website, when it has them; address and phone live with the outlets. */
async function LinkRows({ business }: { business: Business }) {
  const t = await getT();
  if (!business.instagram && !business.website) return null;
  return (
    <div className="flex flex-col gap-4">
      {business.instagram && (
        <DetailRow icon={InstagramIcon} label="Instagram">
          {business.instagram}
        </DetailRow>
      )}
      {business.website && (
        <DetailRow icon={Globe} label={t("Website")}>
          {business.website}
        </DetailRow>
      )}
    </div>
  );
}

/** The shop's overall rating: its outlets' ratings combined, else the average of its few reviews. */
function overallRating(business: Business, reviews: { items: Review[]; total: number }): Rating | undefined {
  const rated = business.outlets.flatMap((o) => (o.rating ? [o.rating] : []));
  const count = rated.reduce((sum, r) => sum + r.count, 0);
  if (count) return { avg: rated.reduce((sum, r) => sum + r.avg * r.count, 0) / count, count };
  if (reviews.total && reviews.items.length === reviews.total) {
    return { avg: reviews.items.reduce((sum, r) => sum + r.rating, 0) / reviews.total, count: reviews.total };
  }
  return undefined;
}

async function OffersTab({ active, expired }: { active: OfferSummary[]; expired: OfferSummary[] }) {
  const t = await getT();
  return (
    <div className="flex flex-col gap-6">
      {active.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          {active.map((offer) => (
            <OfferCard key={offer.slug} offer={offer} sizes="(min-width: 1024px) 400px, 100vw" />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Tag}
          size="md"
          title={t("No live offers right now")}
          hint={t("New offers will appear here.")}
          action={
            <ButtonLink href="/offers" variant="outline" className="h-11">
              {t("Browse other offers")}
            </ButtonLink>
          }
        />
      )}
      {expired.length > 0 && (
        <section>
          <h2 className="mb-4 text-caption font-semibold tracking-[0.04em] text-muted">{t("Past offers")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
            {expired.map((offer) => (
              <OfferCard key={offer.slug} offer={offer} sizes="(min-width: 1024px) 400px, 100vw" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function PhotosTab({ business, images }: { business: Business; images: string[] }) {
  const t = await getT();
  return (
    <div>
      <h2 className="mb-3 text-heading font-semibold">{t("Photos")}</h2>
      <ul className="grid grid-cols-3 gap-2 lg:gap-4">
        {images.map((src) => (
          <li key={src} className="relative aspect-square overflow-hidden rounded-xl bg-surface lg:aspect-[4/3]">
            <Image src={src} alt={t("Photo of {business}", { business: business.name })} fill sizes="(min-width: 1024px) 270px, 33vw" className="object-cover" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Phone version of the outlet cards that sit beside the map on desktop. */
async function OutletsTab({ business, path }: { business: Business; path: string }) {
  const t = await getT();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-heading font-semibold">{t(business.outlets.length > 1 ? "Outlets ({count})" : "Outlet ({count})", { count: business.outlets.length })}</h2>
      <OutletSideCards outlets={business.outlets} contact={business} path={path} />
    </div>
  );
}

async function AboutTab({ business }: { business: Business }) {
  const t = await getT();
  return (
    <div className="flex flex-col gap-7">
      <section>
        <h2 className="mb-2 text-heading font-semibold">{t("About us")}</h2>
        <p className="max-w-[640px] text-body-sm leading-relaxed text-muted">{business.about}</p>
      </section>
      <div className="lg:hidden">
        <LinkRows business={business} />
      </div>
    </div>
  );
}

async function BusinessContent({ params }: Pick<PageProps<"/[lang]/businesses/[slug]">, "params">) {
  const t = await getT();
  const business = await getBusiness((await params).slug);
  if (!business) notFound();
  const [{ active, expired }, reviews, category] = await Promise.all([
    getBusinessOffers(business.slug),
    getBusinessReviews(business.id, business.outlets),
    // A shop's own category can sit below the offer categories ("Footwear Stores" under "Footwear"); only those have a list page.
    getCategory(business.categorySlug),
  ]);
  const path = shopPath(business.slug);
  const subtitle = t("{category} • {area}, Rajkot", { category: business.categoryName, area: business.areaName });

  const crumbs = await breadcrumbLd([
    { name: t("Home"), path: "/" },
    ...(category ? [{ name: category.shortName, path: offersPath(undefined, category.slug) }] : []),
    { name: business.name, path },
  ]);

  const images = [...new Set([business.cover, ...business.photos])];
  const rating = overallRating(business, reviews);
  const mobileButtons = (
    <div className="absolute inset-x-4 top-4 lg:hidden">
      <BackLink fallbackHref="/offers" variant="floating" />
    </div>
  );

  // One pin per outlet that has a location; a shop without outlet locations gets a single pin at its address.
  const several = business.outlets.length > 1;
  const pins: MapOutlet[] = business.outlets.flatMap((o, i) =>
    o.geo ? [{ id: o.id, name: several ? o.name : business.name, address: o.address, lat: o.geo.lat, lng: o.geo.lng, main: o.isMain, ...(several ? { number: i + 1 } : {}) }] : [],
  );
  if (!pins.length) pins.push({ id: business.id, name: business.name, address: business.address, lat: business.geo.lat, lng: business.geo.lng, main: true });
  if (!pins.some((pin) => pin.main)) pins[0] = { ...pins[0], main: true };

  return (
    <div className="lg:bg-surface lg:pt-6 lg:pb-16">
      <JsonLd data={await localBusinessLd(business, active, rating, reviews.items)} />
      <JsonLd data={crumbs} />
      <Container className="px-0 lg:px-5">
        <div className="overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-white">
          <PhotoMosaic images={images} alt={business.name}>
            {mobileButtons}
          </PhotoMosaic>
          <div className="flex flex-col gap-3 px-5 pt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8 lg:py-6">
            <div className="flex min-w-0 items-start gap-4 lg:items-center">
              <ShopAvatar logo={business.logo} className="size-16 shrink-0 lg:size-20" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 className="text-page leading-tight font-semibold">{business.name}</h1>
                  {rating && <RatingInline rating={rating} className="text-body-sm text-muted" />}
                </div>
                <p className="mt-1 text-body-sm text-muted">{subtitle}</p>
              </div>
            </div>
            {/* Follow: new offers from this shop come first and are announced. On desktop it sits at the right of the header; on a phone it is in the bottom bar. */}
            <FollowButton slug={business.slug} className="hidden lg:inline-flex lg:self-center" />
            {/* On a phone the contact buttons sit under the name; on desktop they float at the bottom. */}
            <ContactRow contact={business} className="lg:hidden" />
          </div>
        </div>
      </Container>

      <Container className="pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:pb-0">
        <div className="mt-6 min-w-0 lg:mt-6 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:pb-8">
          <SectionTabs
            label={t("Page sections")}
            topBar={
              <div className="flex h-full items-center justify-between gap-1 border-b border-line px-2">
                <BackLink fallbackHref="/offers" />
                {business.logo && (
                  <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-surface">
                    <Image src={business.logo} alt="" fill sizes="32px" className="object-cover" />
                  </span>
                )}
                <p className="min-w-0 flex-1 truncate text-title font-semibold">{business.name}</p>
                <div className="flex shrink-0 items-center">
                  <ContactLink business={business.slug} kind="call" number={business.phone} masked={business.contactMasked} className={headerAction}>
                    <Phone size={20} aria-hidden />
                    <span className="sr-only">{t("Call")}</span>
                  </ContactLink>
                  <ContactLink business={business.slug} kind="whatsapp" number={business.whatsapp} masked={business.contactMasked} className={cn(headerAction, "text-whatsapp-ink")}>
                    <WhatsAppIcon size={20} />
                    <span className="sr-only">WhatsApp</span>
                  </ContactLink>
                  <a href={directionsHref(business.geo.lat, business.geo.lng)} target="_blank" rel="noreferrer" className={headerAction}>
                    <Navigation size={20} aria-hidden />
                    <span className="sr-only">{t("Directions")}</span>
                  </a>
                </div>
              </div>
            }
            items={[
              {
                value: "offers",
                label: t("Offers ({count})", { count: active.length }),
                content: <OffersTab active={active} expired={expired} />,
              },
              { value: "about", label: t("About us"), content: <AboutTab business={business} /> },
              ...(images.length > 1
                ? [{ value: "photos", label: t("Photos ({count})", { count: images.length }), content: <PhotosTab business={business} images={images} /> }]
                : []),
              {
                value: "outlets",
                label: t(business.outlets.length > 1 ? "Outlets ({count})" : "Outlet ({count})", { count: business.outlets.length }),
                content: <OutletsTab business={business} path={path} />,
                // On desktop the outlets live in the sidebar beside the map.
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

        {/* Desktop side cards; on a phone this information sits under About us. */}
        <aside className="mt-6 hidden flex-col gap-6 lg:flex">
          <section className="overflow-hidden rounded-2xl border border-line bg-white">
            <OutletMap outlets={pins} className="h-[260px]" />
          </section>
          <OutletSideCards outlets={business.outlets} contact={business} path={path} />
          {(business.instagram || business.website) && (
            <section className="rounded-2xl border border-line bg-white p-6">
              <LinkRows business={business} />
            </section>
          )}
        </aside>
      </Container>

      {/* Desktop: the shop's actions float at the bottom centre while the page scrolls. */}
      <div className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-float lg:flex">
        <ContactLink business={business.slug} kind="call" number={business.phone} masked={business.contactMasked} className={buttonClass({ size: "sm" })}>
          <Phone size={18} aria-hidden />
          {t("Call")}
        </ContactLink>
        <ContactLink business={business.slug} kind="whatsapp" number={business.whatsapp} masked={business.contactMasked} className={buttonClass({ variant: "whatsapp", size: "sm" })}>
          <WhatsAppIcon size={18} />
          WhatsApp
        </ContactLink>
        <a href={directionsHref(business.geo.lat, business.geo.lng)} target="_blank" rel="noreferrer" className={buttonClass({ variant: "outline", size: "sm" })}>
          <Navigation size={18} aria-hidden />
          {t("Directions")}
        </a>
        <ShareButton title={business.name} path={path} variant="pill" />
        <SaveTextButton slug={business.slug} kind="shop" variant="outline" />
      </div>

      <StickyActionBar
        lead={
          <>
            <FollowBarButton slug={business.slug} />
            <SaveBarButton slug={business.slug} kind="shop" variant="outline" />
            <ShareButton title={business.name} path={path} variant="bar" />
          </>
        }
      />
    </div>
  );
}

export default function BusinessPage({ params }: PageProps<"/[lang]/businesses/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton kind="shop" />}>
      <BusinessContent params={params} />
    </Suspense>
  );
}
