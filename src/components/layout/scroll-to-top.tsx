"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** How far the page scrolls (px) before the button appears: about one screen. */
const SHOW_AFTER = 600;

/**
 * Round "back to top" button, bottom right, shown once the page has scrolled a screen. On a phone it
 * sits above whatever bar is fixed to the bottom (the tab bar, or an offer page's action bar), which
 * marks itself with `data-bottom-bar`.
 */
export function ScrollToTop() {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > SHOW_AFTER);
      const bar = document.querySelector<HTMLElement>("[data-bottom-bar]");
      setLift(bar ? Math.round(bar.getBoundingClientRect().height) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label={t("Back to top")}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      style={{ bottom: `calc(${lift}px + 0.75rem)` }}
      className={cn(
        "fixed right-4 z-30 flex size-11 cursor-pointer items-center justify-center rounded-full border border-line bg-white text-ink shadow-float transition-opacity duration-200 lg:right-6 lg:bottom-6!",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <ArrowUp size={20} aria-hidden />
    </button>
  );
}
