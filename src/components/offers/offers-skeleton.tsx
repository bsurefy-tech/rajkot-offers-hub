"use client";

import { PageTitleSkeleton, Skeleton } from "@/components/ui/display";
import { useT } from "@/lib/i18n/client";
import { OfferGridSkeleton } from "./offer-card";

/** Widths (phone, desktop) of the Category / Offer type / Validity / Sort chips. */
const CHIP_WIDTHS = ["w-[111px] lg:w-[120px]", "w-[117px] lg:w-[126px]", "w-[100px] lg:w-[107px]", "w-20 lg:w-[86px]"];

/**
 * The filter chips and the first offers, as `OffersExplorer` lays them out. `search` adds the phone's
 * search box above the chips (the offers page; a category page has none).
 */
export function OfferListSkeleton({ search }: { search?: boolean }) {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("Loading offers")} className="flex flex-col gap-4 lg:gap-6">
      {search && (
        <div className="-mb-4 pt-3 lg:hidden">
          <Skeleton className="h-[46px] rounded-xl" />
        </div>
      )}
      <div className="-mx-4 flex justify-between gap-4 border-b border-line bg-white px-4 py-3 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="no-scrollbar flex gap-2 overflow-hidden">
          {CHIP_WIDTHS.map((width) => (
            <Skeleton key={width} className={`h-8 shrink-0 rounded-full lg:h-[38px] ${width}`} />
          ))}
        </div>
        <Skeleton className="hidden h-[38px] w-[167px] shrink-0 rounded-full lg:block" />
      </div>
      <OfferGridSkeleton count={8} columns={4} />
    </div>
  );
}

/**
 * The offers page while it loads: centred title, the desktop search box, then the list. Pages for one
 * area or category also have a line under the title (`subtitle`).
 */
export function OffersSkeleton({ subtitle }: { subtitle?: boolean }) {
  return (
    <>
      <div className="mb-2 flex flex-col gap-6 lg:mb-10 lg:items-center lg:gap-8">
        <PageTitleSkeleton center subtitle={subtitle ?? false} />
        <Skeleton className="hidden h-[52px] w-[560px] max-w-full rounded-[14px] lg:block" />
      </div>
      <OfferListSkeleton search />
    </>
  );
}
