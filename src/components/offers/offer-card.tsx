"use client";

import Image from "next/image";
import { Link } from "@/components/i18n/link";
import { Clock, MapPin, Tag } from "lucide-react";
import type { ReactNode } from "react";
import type { OfferSummary } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/display";
import { RatingInline } from "@/components/ui/rating";
import { formatDistance, formatRupees, formatUntil } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";
import { SaveButton } from "./save-button";
import { offerPath } from "@/lib/paths";

interface OfferCardProps {
  offer: OfferSummary;
  /** Image sizes hint for next/image. */
  sizes?: string;
  priority?: boolean;
  /** Extra content under the card body (e.g. "expires soon" line). */
  footer?: ReactNode;
  className?: string;
}

/** The offer tile used in every list, grid and carousel. */
export function OfferCard({
  offer,
  sizes = "(min-width: 1024px) 380px, 100vw",
  priority,
  footer,
  className,
}: OfferCardProps) {
  const t = useT();
  const locale = useLocale();
  const expired = offer.isExpired;
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-card",
        className,
      )}
    >
      <div className={cn("relative aspect-[16/9] overflow-hidden bg-surface sm:aspect-[4/3]", expired && "opacity-65 grayscale")}>
        <Image
          src={offer.images[0]}
          // The card's link names the offer; the photo is not inside it, so it describes itself for image search.
          alt={`${offer.title}, ${offer.businessName}`}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "transition-transform duration-300 group-hover:scale-[1.03]",
            offer.imageIsLogo ? "object-contain p-8" : "object-cover",
          )}
        />
        <Badge variant={expired ? "expired" : "offer"} className="absolute top-2.5 left-2.5 lg:top-3 lg:left-3">
          {expired ? t("Expired") : offer.badge}
        </Badge>
      </div>
      <div className={cn("flex flex-col gap-1 px-3.5 pt-3 pb-3.5 lg:gap-1.5 lg:px-4 lg:pt-4 lg:pb-[18px]", expired && "opacity-65")}>
        <h3 className="line-clamp-2 text-title leading-[1.4] font-semibold lg:leading-[1.45]">
          <Link href={offerPath(offer)} onClick={() => track("offer_card_click", { offer_id: offer.id })} className="after:absolute after:inset-0 after:content-['']">
            {offer.title}
          </Link>
        </h3>
        <p className="text-body-sm text-muted">
          {offer.businessName}
          {offer.distanceKm !== undefined && (
            <>
              {" · "}
              <span className="font-medium text-ink">{formatDistance(offer.distanceKm, t)}</span>
            </>
          )}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-muted lg:mt-1.5">
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden />
            {offer.areaName}
          </span>
          <span aria-hidden className="text-line-strong">
            •
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden />
            {formatUntil(offer.validTo, locale)}
          </span>
          {offer.rating && (
            <>
              <span aria-hidden className="text-line-strong">
                •
              </span>
              <RatingInline rating={offer.rating} />
            </>
          )}
        </p>
        {offer.minSpend && (
          <p className="flex items-center gap-1 text-caption text-muted">
            <Tag size={14} aria-hidden />
            {t("On bills of {amount} or more", { amount: formatRupees(offer.minSpend) })}
          </p>
        )}
      </div>
      {footer && <div className="relative z-10 mt-auto px-4 pb-4">{footer}</div>}
      <SaveButton slug={offer.slug} className="absolute top-3 right-3 z-10" />
    </article>
  );
}

/** Same box as `OfferCard` (photo, two-line title, shop, details), so the list does not move once the offers arrive. */
export function OfferCardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("overflow-hidden rounded-2xl border border-line bg-white", className)}>
      <Skeleton className="aspect-[16/9] rounded-none sm:aspect-[4/3]" />
      <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5 lg:gap-1.5 lg:px-4 lg:pt-4 lg:pb-[18px]">
        <div className="flex h-[42px] lg:h-[46px] flex-col justify-center gap-2">
          <Skeleton className="h-3.5 w-full" />
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

/** Responsive grid: 1 column on mobile, 2 on tablet, 3 (or 4) on desktop. */
export function OfferGrid({
  offers,
  columns = 3,
  className,
}: {
  offers: OfferSummary[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4",
        className,
      )}
    >
      {offers.map((offer, i) => (
        <OfferCard
          key={offer.slug}
          offer={offer}
          priority={i < 2}
          sizes={
            columns === 4
              ? "(min-width: 1024px) 285px, (min-width: 640px) 50vw, 100vw"
              : "(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
          }
        />
      ))}
    </div>
  );
}

export function OfferGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6", columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, i) => (
        <OfferCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Horizontal scroller on mobile; becomes a grid on desktop. */
export function OfferCarousel({ offers, desktopColumns = 3 }: { offers: OfferSummary[]; desktopColumns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1",
        "lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0",
        desktopColumns === 4
          ? "lg:grid-cols-4 lg:[&>*:nth-child(n+5)]:hidden"
          : "lg:grid-cols-3 lg:[&>*:nth-child(n+4)]:hidden",
      )}
    >
      {offers.map((offer) => (
        <OfferCard
          key={offer.slug}
          offer={offer}
          sizes={
            desktopColumns === 4 ? "(min-width: 1024px) 285px, 85vw" : "(min-width: 1024px) 384px, 85vw"
          }
          className="w-[85vw] max-w-[340px] shrink-0 snap-start lg:w-auto lg:max-w-none"
        />
      ))}
    </div>
  );
}

/** Placeholder for `OfferCarousel`: a row that scrolls on a phone, a grid on desktop. */
export function OfferCarouselSkeleton({ desktopColumns = 3 }: { desktopColumns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "no-scrollbar -mx-4 flex gap-3 overflow-hidden px-4 pb-1",
        "lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0",
        desktopColumns === 4
          ? "lg:grid-cols-4 lg:[&>*:nth-child(n+5)]:hidden"
          : "lg:grid-cols-3 lg:[&>*:nth-child(n+4)]:hidden",
      )}
    >
      {Array.from({ length: desktopColumns + 1 }, (_, i) => (
        <OfferCardSkeleton key={i} className="w-[85vw] max-w-[340px] shrink-0 lg:w-auto lg:max-w-none" />
      ))}
    </div>
  );
}
