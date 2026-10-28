"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { PhotoViewer } from "./photo-gallery";

/** The first photo is the page's main image on both layouts, so it loads straight away (not preloaded: which one shows depends on the screen). */
const first = { loading: "eager", fetchPriority: "high" } as const;

/** Most photos the phone row tries to fit, and the gap between them (`gap-1`). */
const ROW_CANDIDATES = 4;
const GAP = 4;

/** Dark cover on the last tile saying how many more photos there are. */
function More({ count }: { count: number }) {
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-heading font-semibold text-white">
      +{count}
    </span>
  );
}

/**
 * The shop's photos at the top of the page; the last tile says how many more there are, and tapping any
 * tile opens that photo in the full-screen viewer.
 * Phone and tablet: one row at a fixed height with as many photos as fit at their own width, so each
 * shows (nearly) whole.
 * Desktop: a big photo with up to four smaller ones in a grid. A single photo fills the whole width.
 */
export function PhotoMosaic({ images, alt, children }: { images: string[]; alt: string; children?: ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const row = useRef<HTMLDivElement>(null);
  // The phone row's size; zero wide on desktop, where it is hidden.
  const [box, setBox] = useState({ width: 0, height: 0 });
  // Width over height of the photos the phone row may show, as each loads.
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const n = images.length;
  const many = n > 1;
  const wide = n >= 5;
  const deskShown = wide ? 5 : Math.min(n, 3);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setBox({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The phone row shows as many photos as fit side by side at their own width (at least one), stretched a
  // little to fill the row. Until the row is measured and their shapes are known it shows two.
  const measured = box.width > 0;
  const candidates = images.slice(0, measured ? ROW_CANDIDATES : 2);
  let phoneShown = Math.min(n, 2);
  if (measured && candidates.every((_, i) => ratios[i])) {
    let used = -GAP;
    phoneShown = 0;
    while (phoneShown < candidates.length && used + GAP + ratios[phoneShown] * box.height <= box.width) {
      used += GAP + ratios[phoneShown] * box.height;
      phoneShown++;
    }
    phoneShown = Math.max(1, phoneShown);
  }

  function measure(i: number, ratio: number) {
    setRatios((r) => (r[i] === ratio ? r : { ...r, [i]: ratio }));
  }

  return (
    <div className="relative">
      <div ref={row} className="flex h-48 gap-1 overflow-hidden bg-surface sm:h-60 lg:hidden">
        {candidates.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={t("Photo {number}", { number: i + 1 })}
            onClick={() => setOpen(i)}
            // Scaled up: grow factors adding up to under 1 (one tall photo) would leave part of the row empty.
            style={{ flexGrow: (ratios[i] ?? 1) * 100 }}
            className={cn("relative min-w-0 basis-0 overflow-hidden", i >= phoneShown && "hidden")}
          >
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              // Photos that may not fit still load, so their shape is known.
              {...(i === 0 ? first : { loading: "eager" })}
              onLoad={(e) => measure(i, e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 1)}
              onError={() => measure(i, 1)}
              sizes="(min-width: 640px) 50vw, 66vw"
              className="object-cover"
            />
            {i === phoneShown - 1 && n > phoneShown && <More count={n - phoneShown} />}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "hidden h-[280px] gap-1 overflow-hidden bg-surface lg:grid",
          many && "grid-cols-[2fr_1fr]",
          wide && "grid-cols-[2fr_1fr_1fr]",
          n >= 3 && "grid-rows-2",
        )}
      >
        {images.slice(0, deskShown).map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={t("Photo {number}", { number: i + 1 })}
            onClick={() => setOpen(i)}
            className={cn("group relative block cursor-zoom-in overflow-hidden", i === 0 && n >= 3 && "row-span-2")}
          >
            <Image
              src={src}
              alt={i === 0 ? alt : ""}
              fill
              {...(i === 0 && first)}
              sizes={i === 0 ? "(min-width: 1240px) 700px, 55vw" : "270px"}
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            {i === deskShown - 1 && n > deskShown && <More count={n - deskShown} />}
          </button>
        ))}
      </div>
      {children}
      <PhotoViewer images={images} alt={alt} index={open} onClose={() => setOpen(null)} />
    </div>
  );
}
