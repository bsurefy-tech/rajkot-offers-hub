"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** Photos shown: three rows, of two on a phone and of three from tablet up. */
const SHOWN = 6;
const SHOWN_WIDE = 9;

/** Dark cover on the last tile saying how many more photos there are. */
export function More({ count, className }: { count: number; className?: string }) {
  const t = useT();
  return (
    <span className={cn("absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white", className)}>
      <span className="text-heading font-semibold">+{count}</span>
      <span className="text-caption font-medium">{t("View more")}</span>
    </span>
  );
}

/**
 * The shop's photos as even tiles (cropped to fit), so the rows line up and the last tile, saying how
 * many more there are, sits at the end where the eye stops. Tapping one opens it whole, full screen,
 * in a viewer you can swipe, arrow-key or click through, across every photo; Escape, the X or the
 * backdrop closes it.
 */
export function PhotoGallery({ images, thumbs, alt }: { images: string[]; thumbs?: Record<string, string>; alt: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const n = images.length;

  return (
    <>
      {/* A hairline gap, and only the grid's outer corners rounded. */}
      <ul className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-xl sm:grid-cols-3">
        {images.slice(0, SHOWN_WIDE).map((src, i) => (
          <li key={src} className={cn(i >= SHOWN && "max-sm:hidden")}>
            <button
              type="button"
              aria-label={t("Photo {number}", { number: i + 1 })}
              onClick={() => setOpen(i)}
              className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden bg-surface"
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              {/* The last photo shown says how many more there are: the 6th on a phone, the 9th from tablet up. */}
              {i === SHOWN - 1 && n > SHOWN && <More count={n - SHOWN} className="sm:hidden" />}
              {i === SHOWN_WIDE - 1 && n > SHOWN_WIDE && <More count={n - SHOWN_WIDE} />}
            </button>
          </li>
        ))}
      </ul>
      <PhotoViewer images={images} thumbs={thumbs} alt={alt} index={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Full-screen photos: swipe, arrow keys or the arrows to move, and a strip of thumbnails to jump to one. */
export function PhotoViewer({
  images,
  thumbs,
  alt,
  index,
  onClose,
}: {
  images: string[];
  /** Small versions of `images` by full URL; the strip uses them so it doesn't download every full photo. */
  thumbs?: Record<string, string>;
  alt: string;
  index: number | null;
  onClose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) {
      dialog.showModal();
      dialog.focus();
      setActive(index);
      // Jump straight to the tapped photo; the track is laid out once the dialog is shown.
      const el = track.current;
      el?.scrollTo({ left: index * el.clientWidth, behavior: "instant" });
      document.documentElement.style.overflow = "hidden";
    }
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  // Keeps the current photo's thumbnail in the middle of the strip.
  useEffect(() => {
    const el = strip.current;
    const thumb = el?.children[active] as HTMLElement | undefined;
    if (el && thumb) el.scrollTo({ left: thumb.offsetLeft - (el.clientWidth - thumb.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  function go(to: number) {
    const el = track.current;
    if (!el || to < 0 || to >= images.length) return;
    // A thumbnail can be far away: jump there rather than slide past every photo in between.
    el.scrollTo({ left: to * el.clientWidth, behavior: Math.abs(to - active) > 1 ? "instant" : "smooth" });
  }

  return (
    <dialog
      ref={ref}
      aria-label={alt}
      tabIndex={-1}
      onClose={(e) => {
        if (e.target !== e.currentTarget) return;
        document.documentElement.style.overflow = "";
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
      className="m-0 h-dvh max-h-none w-full max-w-none bg-black p-0 text-white outline-none backdrop:bg-black"
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2 lg:px-6">
          <span className="text-body font-medium tabular-nums">
            {active + 1} / {images.length}
          </span>
          <button
            type="button"
            aria-label={t("Close")}
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={22} aria-hidden />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={track}
            onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            onClick={(e) => {
              // A click on the dark space around a photo closes the viewer, like the backdrop.
              if (!(e.target instanceof HTMLImageElement)) onClose();
            }}
            className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
          >
            {images.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0 snap-center">
                <Image
                  src={src}
                  alt={i === active ? alt : ""}
                  fill
                  sizes="100vw"
                  loading={Math.abs(i - (index ?? 0)) <= 1 ? "eager" : "lazy"}
                  className="object-contain p-2 lg:p-6"
                />
              </div>
            ))}
          </div>
          {[
            { label: t("Previous"), to: active - 1, Icon: ChevronLeft, side: "left-4" },
            { label: t("Next"), to: active + 1, Icon: ChevronRight, side: "right-4" },
          ].map(({ label, to, Icon, side }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              disabled={to < 0 || to >= images.length}
              onClick={() => go(to)}
              className={cn(
                "absolute top-1/2 hidden size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:invisible lg:flex",
                side,
              )}
            >
              <Icon size={26} aria-hidden />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div ref={strip} className="no-scrollbar relative flex shrink-0 gap-2 overflow-x-auto px-4 pt-3 pb-1 lg:px-6 [&>:first-child]:ml-auto [&>:last-child]:mr-auto">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={t("Photo {number}", { number: i + 1 })}
                aria-current={i === active || undefined}
                onClick={() => go(i)}
                className={cn(
                  "relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-white/10 opacity-50 transition-opacity hover:opacity-80 lg:size-16",
                  i === active && "opacity-100 outline-2 outline-white -outline-offset-2",
                )}
              >
                {/* An API thumbnail is already small; only a photo without one goes through the resizer. */}
                <Image src={thumbs?.[src] ?? src} alt="" fill sizes="64px" unoptimized={!!thumbs?.[src]} className="object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="h-[max(1rem,env(safe-area-inset-bottom))] shrink-0" />
      </div>
    </dialog>
  );
}
