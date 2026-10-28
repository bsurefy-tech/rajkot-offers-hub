"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/i18n/link";
import { track as trackEvent } from "@/lib/analytics/client";
import type { HeroRatios, HeroSlide } from "@/lib/data/banners";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface HeroSliderProps {
  slides: HeroSlide[];
  /** The aspect ratio the API cropped each screen size's picture to. */
  ratios: HeroRatios;
  autoplayMs: number;
  loop: boolean;
  className?: string;
}

/**
 * The home page's banners: swipe or tap the dots, advancing by itself unless the visitor is
 * pointing at it or prefers less motion. Each slide's picture is cropped for the screen size.
 */
export function HeroSlider({ slides, ratios, autoplayMs, loop, className }: HeroSliderProps) {
  const t = useT();
  const track = useRef<HTMLUListElement>(null);
  const paused = useRef(false);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  function show(next: number) {
    const el = track.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    if (count < 2 || autoplayMs <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      const el = track.current;
      if (!el) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      if (current >= count - 1 && !loop) return;
      show((current + 1) % count);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [count, autoplayMs, loop]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("Highlights")}
      className={cn("relative", className)}
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
      onTouchEnd={() => (paused.current = false)}
    >
      <ul
        ref={track}
        onScroll={(event) => {
          const el = event.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        style={{ "--hero-mobile": ratios.mobile, "--hero-tablet": ratios.tablet, "--hero-desktop": ratios.desktop } as React.CSSProperties}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden bg-surface"
      >
        {slides.map((slide, i) => (
          <li key={slide.id} aria-roledescription="slide" className="aspect-(--hero-mobile) w-full shrink-0 snap-center sm:aspect-(--hero-tablet) lg:aspect-(--hero-desktop)">
            <Link href={slide.href} onClick={() => trackEvent("hero_click", { slide: slide.id })} className="block size-full" draggable={false}>
              <picture>
                <source media="(min-width: 1024px)" srcSet={slide.images.desktop} />
                <source media="(min-width: 640px)" srcSet={slide.images.tablet} />
                <img
                  src={slide.images.mobile}
                  alt={slide.alt}
                  draggable={false}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  className="size-full object-cover"
                />
              </picture>
            </Link>
          </li>
        ))}
      </ul>
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              aria-label={t("Go to slide {n}", { n: i + 1 })}
              aria-current={i === index ? "true" : undefined}
              onClick={() => show(i)}
              className={cn("h-2 rounded-full bg-white/80 shadow-sm transition-all", i === index ? "w-6 bg-white" : "w-2")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
