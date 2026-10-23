"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The shop's photos in columns, each at its own height (no cropping). Tapping one opens it full screen
 * in a viewer you can swipe, arrow-key or click through; Escape, the X or the backdrop closes it.
 */
export function PhotoGallery({ images, alt }: { images: string[]; alt: string }) {
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul className="columns-2 gap-2 sm:columns-3 lg:gap-4">
        {images.map((src, i) => (
          <li key={src} className="mb-2 break-inside-avoid lg:mb-4">
            <button
              type="button"
              aria-label={t("Photo {number}", { number: i + 1 })}
              onClick={() => setOpen(i)}
              className="group block w-full cursor-zoom-in overflow-hidden rounded-xl bg-surface"
            >
              <Image
                src={src}
                alt={alt}
                width={600}
                height={600}
                sizes="(min-width: 1024px) 280px, (min-width: 640px) 33vw, 50vw"
                className="h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>
      <PhotoViewer images={images} alt={alt} index={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function PhotoViewer({
  images,
  alt,
  index,
  onClose,
}: {
  images: string[];
  alt: string;
  index: number | null;
  onClose: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
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

  function go(to: number) {
    const el = track.current;
    if (!el || to < 0 || to >= images.length) return;
    el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
  }

  return (
    <dialog
      ref={ref}
      aria-label={alt}
      tabIndex={-1}
      onClose={() => {
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
        <div className="h-[max(1rem,env(safe-area-inset-bottom))] shrink-0" />
      </div>
    </dialog>
  );
}
