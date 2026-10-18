import { OfferCardSkeleton, OfferCarouselSkeleton, OfferGridSkeleton } from "@/components/offers/offer-card";
import { PageTitleSkeleton, Skeleton, TextLineSkeleton } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import { Container, Section } from "./container";

/**
 * Skeletons for pages while their data loads. Each one repeats the page's own spacing, columns and
 * heights (in the page's own classes) so the content takes the placeholder's place without moving.
 */

/** The heading of a home-page style section (`SectionHeader`). */
function SectionHeaderSkeleton({ link }: { link?: boolean }) {
  return (
    <div className="mb-4 flex h-[26px] items-center justify-between gap-4 lg:mb-7 lg:h-9">
      <Skeleton className="h-5 w-40 lg:h-6 lg:w-56" />
      {link && <Skeleton className="h-4 w-16" />}
    </div>
  );
}

/**
 * An offer page (`kind="offer"`) or a shop page (`kind="shop"`): the photo, the header, the tab bar and
 * its first sections, the side cards on desktop, and for an offer the similar offers.
 */
export function DetailSkeleton({ kind }: { kind: "offer" | "shop" }) {
  const offer = kind === "offer";
  return (
    <div aria-busy="true" className="lg:bg-surface lg:pt-6 lg:pb-16">
      <Container className="px-0 lg:px-5">
        {offer && (
          <div className="hidden lg:mb-4 lg:block">
            <Skeleton className="h-5 w-64" />
          </div>
        )}
        <div className="overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-white">
          <Skeleton className="h-48 rounded-none sm:h-60 lg:h-[280px]" />
          <div className="flex flex-col gap-3 px-4 pt-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-8 lg:py-6">
            <div className="flex min-w-0 flex-1 items-start gap-4 lg:items-center">
              {/* A phone's offer page leaves the shop's logo out of the header. */}
              <Skeleton className={cn("size-16 shrink-0 rounded-full lg:size-20", offer && "hidden lg:block")} />
              <div className="min-w-0 flex-1">
                {offer ? (
                  <>
                    <div className="flex h-[30px] items-center lg:h-[35px]">
                      <Skeleton className="h-6 w-4/5 lg:h-7 lg:w-3/5" />
                    </div>
                    <div className="mt-1 hidden h-[22px] items-center lg:flex">
                      <Skeleton className="h-4 w-2/5" />
                    </div>
                    <div className="mt-2 flex h-[39px] flex-col justify-between py-1 lg:h-[21px] lg:justify-center lg:py-0">
                      <Skeleton className="h-3 w-full max-w-[560px]" />
                      <Skeleton className="h-3 w-2/3 lg:hidden" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-[33px] items-center lg:h-[38px]">
                      <Skeleton className="h-6 w-3/5 lg:h-7 lg:w-2/5" />
                    </div>
                    <div className="mt-1 flex h-[42px] flex-col justify-center gap-2 lg:h-[22px]">
                      <Skeleton className="h-3.5 w-full lg:w-1/3" />
                      <Skeleton className="h-3.5 w-2/3 lg:hidden" />
                    </div>
                  </>
                )}
              </div>
            </div>
            {!offer && <Skeleton className="hidden h-10 w-[106px] shrink-0 rounded-xl lg:block" />}
            {/* The shop's call, WhatsApp and directions buttons, under the name on a phone. */}
            {!offer && (
              <div className="flex gap-2 lg:hidden">
                <Skeleton className="size-12 shrink-0 rounded-xl" />
                <Skeleton className="h-12 flex-1 rounded-xl" />
                <Skeleton className="h-12 flex-1 rounded-xl" />
              </div>
            )}
          </div>
        </div>
      </Container>

      <Container className={cn("lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6", !offer && "pb-28 lg:pb-0")}>
        <div className={cn("min-w-0 lg:mt-6 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:pb-8", offer ? "mt-3" : "mt-6")}>
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="-mx-4 flex h-[49px] items-center gap-6 overflow-hidden border-b border-line bg-white px-4 lg:mx-0 lg:gap-8 lg:rounded-t-2xl lg:px-8">
              {[64, 88, 56, 72].map((width, i) => (
                <Skeleton key={i} className="h-4 shrink-0" style={{ width }} />
              ))}
            </div>
            {offer ? <OfferSections /> : <ShopSections />}
          </div>
        </div>

        <aside className="mt-6 hidden flex-col gap-6 lg:flex">
          {offer ? (
            <>
              <Skeleton className="h-[319px] rounded-2xl" />
              <Skeleton className="h-[94px] rounded-2xl" />
            </>
          ) : (
            <>
              <Skeleton className="h-[262px] rounded-2xl" />
              <Skeleton className="h-[256px] rounded-2xl" />
            </>
          )}
        </aside>
      </Container>

      {offer && (
        <section className="mt-10 bg-surface py-8 lg:mt-16 lg:py-0">
          <Container>
            <SectionHeaderSkeleton />
            <OfferCarouselSkeleton />
          </Container>
        </section>
      )}
    </div>
  );
}

const sectionClass = "lg:px-8";
const dividerClass = "h-px bg-line";

/** Details, How to get it and Terms of an offer page. */
function OfferSections() {
  return (
    <>
      <section className={sectionClass}>
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5">
          <Skeleton className="h-[41px] lg:h-[52px]" />
          <Skeleton className="h-[41px] lg:h-[52px]" />
          <Skeleton className="h-[41px] lg:h-[52px]" />
          <Skeleton className="h-[52px] max-lg:hidden" />
        </div>
      </section>
      <div aria-hidden className={dividerClass} />
      <section className={sectionClass}>
        <Skeleton className="h-[182px] rounded-2xl lg:h-[202px]" />
      </section>
      <div aria-hidden className={dividerClass} />
      <section className={cn(sectionClass, "flex flex-col gap-4")}>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-[191px] lg:h-[156px]" />
      </section>
      {/* On a phone the outlets are a section of their own; on desktop they sit in the side column. */}
      <div aria-hidden className={cn(dividerClass, "lg:hidden")} />
      <section className="lg:hidden">
        <Skeleton className="h-[283px] rounded-2xl" />
      </section>
    </>
  );
}

/** The offers and About us of a shop page. */
function ShopSections() {
  return (
    <>
      <section className={cn(sectionClass, "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6")}>
        <OfferCardSkeleton />
        <OfferCardSkeleton />
      </section>
      <div aria-hidden className={dividerClass} />
      <section className={cn(sectionClass, "flex flex-col gap-3")}>
        <Skeleton className="h-6 w-32 lg:h-7" />
        <Skeleton className="h-4 w-full max-w-[640px]" />
        <Skeleton className="h-4 w-full max-w-[640px]" />
        <Skeleton className="h-4 w-2/3 max-w-[640px]" />
      </section>
    </>
  );
}

/** The categories page: title, the category tiles, and the areas. */
export function CategoriesSkeleton() {
  return (
    <>
      {/* The phone's top bar (the page draws its own). */}
      <div className="h-[57px] border-b border-line lg:hidden" />
      <Container aria-busy="true" className="flex flex-col gap-8 pt-5 pb-10 lg:gap-14 lg:pt-12 lg:pb-20">
        <div className="hidden lg:block">
          <PageTitleSkeleton />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="flex h-[43px] flex-col justify-between lg:h-[45px]">
                <Skeleton className="h-4 w-3/4 lg:h-[18px]" />
                <Skeleton className="h-3.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="mb-4 h-[26px] w-44 lg:mb-6 lg:h-[39px] lg:w-64" />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-hidden px-4 lg:mx-0 lg:flex-wrap lg:gap-3 lg:px-0">
            {[96, 120, 88, 110, 104, 92, 116, 100, 108, 96, 112, 90, 118, 104].map((width, i) => (
              <Skeleton key={i} className="h-[38px] shrink-0 rounded-full lg:h-10" style={{ width }} />
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}

/**
 * The home page below its introduction (which needs no data): the category row, today's offers, the
 * new offers and the call to action for shops.
 */
/** The home sections take turns, grey then white, counting only those on the page (some come and go). */
export const ALTERNATING_SECTIONS = "[&>section:nth-of-type(odd)]:bg-surface [&>section:nth-of-type(even)]:bg-white";

export function HomeSectionsSkeleton() {
  return (
    <div aria-busy="true" className={ALTERNATING_SECTIONS}>
      <Section compact className="py-4 lg:py-6">
        <ul className="flex gap-4 overflow-hidden lg:gap-6" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 lg:w-20">
              <Skeleton className="size-[68px] rounded-full lg:size-20" />
              <Skeleton className="h-2.5 w-12" />
            </li>
          ))}
        </ul>
      </Section>

      <Section compact>
        <SectionHeaderSkeleton link />
        <ul className="flex gap-3 overflow-hidden lg:grid lg:grid-cols-6 lg:gap-5" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="w-[calc((100vw-2.75rem)/2.08)] shrink-0 lg:w-auto">
              <Skeleton className="aspect-[9/16] rounded-2xl" />
            </li>
          ))}
        </ul>
      </Section>

      <Section compact>
        <SectionHeaderSkeleton />
        <ul className="grid grid-cols-4 gap-x-3 gap-y-5 lg:grid-cols-8 lg:gap-6" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
            <li key={i} className={cn("flex flex-col items-center gap-2", i >= 12 && "hidden lg:flex")}>
              <Skeleton className="size-[60px] rounded-full lg:size-[76px]" />
              <div className="flex h-[15px] items-center lg:h-[18px]">
                <Skeleton className="h-2.5 w-12 lg:w-14" />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section compact>
        <SectionHeaderSkeleton />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-hidden px-4 lg:mx-0 lg:flex-wrap lg:gap-3 lg:px-0">
          {[110, 128, 96, 118, 104, 124, 100, 116, 108, 120].map((width, i) => (
            <Skeleton key={i} className="h-[38px] shrink-0 rounded-full lg:h-10" style={{ width }} />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeaderSkeleton link />
        <OfferCarouselSkeleton />
      </Section>

      <Section>
        <SectionHeaderSkeleton />
        <OfferGridSkeleton count={6} />
        <div className="mt-6 flex justify-center lg:mt-10">
          <Skeleton className="h-12 w-full rounded-xl lg:w-[152px]" />
        </div>
      </Section>

      <Section>
        <Skeleton className="h-[400px] rounded-2xl lg:h-[402px]" />
      </Section>
    </div>
  );
}

/** The signed-in parts of the account page: profile, points, grouped rows and the account group. */
export function AccountSkeleton({ rewards }: { rewards?: boolean }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <Skeleton className="h-[90px] rounded-2xl" />
      {rewards && <Skeleton className="h-[148px] rounded-2xl" />}
      <Skeleton className="h-[266px] rounded-2xl" />
      <Skeleton className="h-[103px] rounded-2xl" />
      <Skeleton className="h-[103px] rounded-2xl" />
      <Skeleton className="h-[224px] rounded-2xl" />
    </div>
  );
}

/** The mobile-number field and button of the login form. */
export function LoginFormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <TextLineSkeleton height={20} className="w-28" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <Skeleton className="h-[52px] rounded-xl" />
    </div>
  );
}
