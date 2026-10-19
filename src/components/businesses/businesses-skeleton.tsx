"use client";

import { PageTitleSkeleton, Skeleton } from "@/components/ui/display";
import { useT } from "@/lib/i18n/client";
import { BusinessGridSkeleton } from "./business-card";

/** Widths (phone, desktop) of the Category / Area / Sort chips. */
const CHIP_WIDTHS = ["w-[111px] lg:w-[120px]", "w-[84px] lg:w-[92px]", "w-20 lg:w-[86px]"];

/** The search box, filter chips and first shops, as `BusinessesExplorer` lays them out. */
export function BusinessListSkeleton() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("Loading shops")} className="flex flex-col gap-4 lg:gap-6">
      <div className="-mb-4 pt-3 lg:hidden">
        <Skeleton className="h-[46px] rounded-xl" />
      </div>
      <div className="-mx-4 flex gap-2 border-b border-line bg-white px-4 py-3 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        {CHIP_WIDTHS.map((width) => (
          <Skeleton key={width} className={`h-8 shrink-0 rounded-full lg:h-[38px] ${width}`} />
        ))}
      </div>
      <BusinessGridSkeleton />
    </div>
  );
}

/** The shops page while it loads: centred title, the desktop search box, then the list. */
export function BusinessesSkeleton() {
  return (
    <>
      <div className="mb-2 flex flex-col gap-6 lg:mb-10 lg:items-center lg:gap-8">
        <PageTitleSkeleton center subtitle={false} />
        <Skeleton className="hidden h-[52px] w-[560px] max-w-full rounded-[14px] lg:block" />
      </div>
      <BusinessListSkeleton />
    </>
  );
}
