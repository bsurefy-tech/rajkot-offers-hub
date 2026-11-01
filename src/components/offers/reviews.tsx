import { BadgeCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Review } from "@/types";
import { Stars } from "@/components/ui/rating";
import { formatShortDate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/** The newest reviews, each with its stars, text and the outlet it is about, under `children` (the form to write one). */
export async function ReviewList({ reviews, total, title, children }: { reviews: Review[]; total: number; title?: string; children?: ReactNode }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <section aria-label={title ?? t("Reviews")}>
      <h2 className="in-data-first:sr-only mb-3 text-heading font-semibold">
        {title ?? t("Reviews")} {total > 0 && <span className="font-normal text-muted">({total})</span>}
      </h2>
      {children}
      {reviews.length > 0 && (
        <ul className={cn("flex flex-col divide-y divide-line", children && "mt-4")}>
          {reviews.map((review) => (
            <li key={review.id} className="py-5 first:pt-1 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <p className="min-w-0 text-body font-semibold">{review.title}</p>
                <Stars value={review.rating} label={t("{rating} out of 5", { rating: review.rating })} className="mt-0.5 shrink-0" />
              </div>
              {review.body && <p className="mt-1 text-body-sm leading-relaxed text-muted">{review.body}</p>}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
                {[review.author, review.outlet, formatShortDate(review.date, locale)].filter(Boolean).join(" · ")}
                {review.verified && (
                  <span className="inline-flex items-center gap-1 font-medium text-open">
                    <BadgeCheck size={14} aria-hidden />
                    {t("Used this offer")}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
