"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { PhotoViewer } from "./photo-gallery";

/**
 * The shop's photos as one tile grid: a big photo with up to two (phone) or four (desktop) smaller ones,
 * the last tile saying how many more there are. Tapping a tile opens that photo in the full-screen viewer.
 * A single photo fills the whole width.
 */
export function PhotoMosaic({ images, alt, children }: { images: string[]; alt: string; children?: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;
  const many = n > 1;
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
        return (
          <button
            key={src}
            type="button"
            aria-label={t("Photo {number}", { number: i + 1 })}
            onClick={() => setOpen(i)}
            className={cn(
              "group relative block cursor-zoom-in overflow-hidden",
              i === 0 && n >= 3 && "row-span-2",
              i >= phoneShown && "hidden lg:block",
            )}
          >
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
          </button>
        );
      })}
      {children}
      <PhotoViewer images={images} alt={alt} index={open} onClose={() => setOpen(null)} />
    </div>
  );
}
