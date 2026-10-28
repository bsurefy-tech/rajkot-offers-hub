import Image from "next/image";
import { TrackClick } from "@/components/analytics/track-click";
import { Link } from "@/components/i18n/link";
import { ArrowRight } from "lucide-react";
import type { Area, CategoryWithCount } from "@/types";
import { CategoryIcon } from "@/components/icons/category-icon";
import { AreaChip } from "@/components/ui/chip";
import { formatOfferCount } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export function categoryHref(slug: string) {
  return `/categories/${slug}`;
}

/** Categories shown on the home page: three rows, which is 12 on a phone (4 columns) and 24 on desktop (8). */
const HOME_PHONE_COUNT = 12;
const HOME_DESKTOP_COUNT = 24;

/** Round icon + label in three rows; the rest are one tap away on the categories page. */
export function CategoryIconRow({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <ul className="grid grid-cols-4 gap-x-3 gap-y-5 lg:grid-cols-8 lg:gap-6">
      {categories.slice(0, HOME_DESKTOP_COUNT).map((c, i) => (
        <li key={c.slug} className={i >= HOME_PHONE_COUNT ? "hidden lg:block" : undefined}>
          <TrackClick event="category_open" properties={{ category: c.slug }}>
            <Link href={categoryHref(c.slug)} className="group flex flex-col items-center gap-2 text-center">
              <span className="flex size-[60px] items-center justify-center rounded-full bg-surface transition-colors group-hover:bg-canvas lg:size-[76px]">
                <CategoryIcon name={c.icon} className="size-6 lg:size-[30px]" />
              </span>
              <span className="text-caption leading-tight">{c.shortName}</span>
            </Link>
          </TrackClick>
        </li>
      ))}
    </ul>
  );
}

/** Square image tile with name and offer count. */
export async function CategoryImageGrid({ categories }: { categories: CategoryWithCount[] }) {
  const t = await getT();
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-8">
      {categories.map((c) => (
        <li key={c.slug}>
          <TrackClick event="category_open" properties={{ category: c.slug }}>
            <Link href={categoryHref(c.slug)} className="group flex flex-col gap-2.5">
              <span className="relative aspect-square overflow-hidden rounded-2xl bg-surface">
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 285px, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </span>
              <span>
                <span className="block text-title leading-snug font-semibold">{c.name}</span>
                <span className="mt-0.5 block text-body-sm text-muted">{formatOfferCount(c.offerCount, t)}</span>
              </span>
            </Link>
          </TrackClick>
        </li>
      ))}
    </ul>
  );
}

interface CategoryBannerProps {
  title: string;
  description?: string;
  image: string;
  eyebrow?: string;
  href?: string;
  cta?: string;
  /** "feature": tall promo banner; "hero": category page header. */
  variant?: "feature" | "hero";
  className?: string;
}

/** Image banner with a dark gradient and overlay text. */
export function CategoryBanner({
  title,
  description,
  image,
  eyebrow,
  href,
  cta,
  variant = "feature",
  className,
}: CategoryBannerProps) {
  const body = (
    <>
      <Image src={image} alt="" fill priority sizes="(min-width: 1240px) 1200px, 100vw" className="object-cover" />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-ink/0 via-ink/20 to-ink/75 lg:bg-gradient-to-r lg:from-ink/78 lg:via-ink/40 lg:to-ink/0"
      />
      <span className="absolute inset-x-5 bottom-5 flex flex-col gap-1 text-white lg:inset-x-12 lg:top-1/2 lg:bottom-auto lg:max-w-md lg:-translate-y-1/2 lg:gap-2">
        {eyebrow && <span className="text-caption font-semibold text-white/80">{eyebrow}</span>}
        <span
          className={cn(
            "font-semibold",
            variant === "feature" ? "text-page lg:leading-tight" : "text-page",
          )}
        >
          {title}
        </span>
        {description && (
          <span className={cn("text-white/85", variant === "hero" ? "text-body-sm" : "hidden text-body lg:block")}>
            {description}
          </span>
        )}
        {cta && (
          <span className="mt-1 inline-flex items-center gap-1 text-body font-semibold lg:mt-3">
            {cta}
            <ArrowRight size={16} aria-hidden />
          </span>
        )}
      </span>
    </>
  );

  const classes = cn(
    "relative block overflow-hidden rounded-2xl bg-ink",
    variant === "feature" ? "aspect-video lg:aspect-auto lg:h-[300px]" : "h-40 lg:h-[280px]",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export function AreaPills({ areas, className }: { areas: Area[]; className?: string }) {
  return (
    <ul
      className={cn(
        "no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:gap-3 lg:overflow-visible lg:px-0",
        className,
      )}
    >
      {areas.map((a) => (
        <li key={a.slug}>
          <AreaChip href={`/${a.slug}/offers`}>{a.name}</AreaChip>
        </li>
      ))}
    </ul>
  );
}
