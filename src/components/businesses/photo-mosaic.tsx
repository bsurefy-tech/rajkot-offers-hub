import Image from "next/image";
import type { ReactNode } from "react";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/**
 * The shop's photos as one tile grid: a big photo with up to two (phone) or four (desktop) smaller ones,
 * the last tile saying how many more there are. Tiles jump to the Photos tab when the shop has more
 * than one photo (unless `linked` is off). A single photo fills the whole width.
 */
export async function PhotoMosaic({
  images,
  alt,
  linked = true,
  children,
}: {
  images: string[];
  alt: string;
  /** Tiles jump to a #photos section; off where the page has none (an offer page). */
  linked?: boolean;
  children?: ReactNode;
}) {
  const t = await getT();
  const n = images.length;
  const many = n > 1;
  const links = many && linked;
  const wide = n >= 5;
  const phoneShown = Math.min(n, 3);
  const deskShown = wide ? 5 : phoneShown;

  return (
    <div
      className={cn(
        "relative grid h-48 gap-1 overflow-hidden bg-surface sm:h-60 lg:h-[280px]",
        many && "grid-cols-[2fr_1fr]",
        wide && "lg:grid-cols-[2fr_1fr_1fr]",
        n >= 3 && "grid-rows-2",
      )}
    >
      {images.slice(0, deskShown).map((src, i) => {
        const phoneMore = i === phoneShown - 1 ? n - phoneShown : 0;
        const deskMore = i === deskShown - 1 ? n - deskShown : 0;
        const moreCount = phoneMore || deskMore;
        const className = cn(
          "group relative block overflow-hidden",
          i === 0 && n >= 3 && "row-span-2",
          i >= phoneShown && "hidden lg:block",
        );
        const tile = (
          <>
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width: 1240px) 700px, (min-width: 1024px) 55vw, 66vw" : "(min-width: 1024px) 270px, 34vw"}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {moreCount > 0 && (
              <span
                className={cn(
                  "absolute inset-0 items-center justify-center bg-black/45 text-heading font-semibold text-white",
                  phoneMore && deskMore ? "flex" : phoneMore ? "flex lg:hidden" : "hidden lg:flex",
                )}
              >
                +{moreCount}
              </span>
            )}
          </>
        );
        return links ? (
          <a key={src} href="#photos" className={className} aria-label={t("See all photos")}>
            {tile}
          </a>
        ) : (
          <div key={src} className={className}>
            {tile}
          </div>
        );
      })}
      {children}
    </div>
  );
}
