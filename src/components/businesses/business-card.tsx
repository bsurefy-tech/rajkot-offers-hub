"use client";

import Image from "next/image";
import { BadgeCheck, MapPin, Store } from "lucide-react";
import { Link } from "@/components/i18n/link";
import type { BusinessSummary } from "@/types";
import { Skeleton } from "@/components/ui/display";
import { RatingInline } from "@/components/ui/rating";
import { track } from "@/lib/analytics/client";
import { useT } from "@/lib/i18n/client";
import { shopPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/** The shop tile of the shops list; laid out like `OfferCard`, with the shop's photo above its name. */
export function BusinessCard({ business, priority, className }: { business: BusinessSummary; priority?: boolean; className?: string }) {
  const t = useT();
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-card", className)}>
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-surface text-faint sm:aspect-[4/3]">
        {business.image ? (
          <Image
            src={business.image}
            alt={`${business.name}${business.categoryName ? `, ${business.categoryName}` : ""}`}
            fill
            sizes="(min-width: 1024px) 285px, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            className={cn("transition-transform duration-300 group-hover:scale-[1.03]", business.imageIsLogo ? "object-contain p-8" : "object-cover")}
          />
        ) : (
          <Store size={40} strokeWidth={1.4} aria-hidden />
        )}
      </div>
      <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5 lg:gap-1.5 lg:px-4 lg:pt-4 lg:pb-[18px]">
        <h3 className="flex items-center gap-1.5 text-title leading-[1.4] font-semibold lg:leading-[1.45]">
          <Link href={shopPath(business.slug)} onClick={() => track("shop_card_click", { shop: business.slug })} className="line-clamp-2 after:absolute after:inset-0 after:content-['']">
            {business.name}
          </Link>
          {business.verified && <BadgeCheck size={18} aria-label={t("Verified")} className="shrink-0 fill-primary text-white" />}
        </h3>
        {business.tagline ? (
          <p className="line-clamp-1 text-body-sm text-muted">{business.tagline}</p>
        ) : (
          business.categoryName && <p className="text-body-sm text-muted">{business.categoryName}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-muted lg:mt-1.5">
          {business.tagline && business.categoryName && (
            <>
              <span>{business.categoryName}</span>
              <span aria-hidden className="text-line-strong">
                •
              </span>
            </>
          )}
          {business.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} aria-hidden />
              {business.city}
            </span>
          )}
          {business.rating && (
            <>
              <span aria-hidden className="text-line-strong">
                •
              </span>
              <RatingInline rating={business.rating} />
            </>
          )}
        </p>
      </div>
    </article>
  );
}

/** Same box as `BusinessCard`, so the list does not move once the shops arrive. */
export function BusinessCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("overflow-hidden rounded-2xl border border-line bg-white", className)}>
      <Skeleton className="aspect-[16/9] rounded-none sm:aspect-[4/3]" />
      <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5 lg:gap-1.5 lg:px-4 lg:pt-4 lg:pb-[18px]">
        <div className="flex h-[28px] items-center lg:h-[29px]">
          <Skeleton className="h-3.5 w-3/5" />
        </div>
        <div className="flex h-5 items-center">
          <Skeleton className="h-3.5 w-2/5" />
        </div>
        <div className="mt-1.5 flex h-5 items-center">
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6";

export function BusinessGrid({ businesses }: { businesses: BusinessSummary[] }) {
  return (
    <div className={GRID}>
      {businesses.map((business, i) => (
        <BusinessCard key={business.slug} business={business} priority={i < 2} />
      ))}
    </div>
  );
}

export function BusinessGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }, (_, i) => (
        <BusinessCardSkeleton key={i} />
      ))}
    </div>
  );
}
