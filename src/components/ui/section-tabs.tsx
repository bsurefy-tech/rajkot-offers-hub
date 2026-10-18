"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode, Fragment } from "react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export interface SectionTab {
  /** Also the id of the section, so it must be unique on the page. */
  value: string;
  label: ReactNode;
  content: ReactNode;
  /** Classes for the tab and its section together, e.g. "lg:hidden" or "lg:order-2" to reorder or drop it on one screen size. */
  className?: string;
}

interface SectionTabsProps {
  items: SectionTab[];
  /** Accessible name of the tab bar. */
  label: string;
  /**
   * Mobile header (56px, e.g. back, title, share) that slides in above the tab bar once the
   * tab bar has stuck to the top. Hidden on large screens.
   */
  topBar?: ReactNode;
  className?: string;
}

/**
 * All sections on one scrolling page with a tab bar that sticks to the top.
 * Tapping a tab scrolls to its section, and scrolling highlights the tab of the
 * section being read. Without JavaScript the tabs are plain "#section" links.
 */
export function SectionTabs({ items, label, topBar, className }: SectionTabsProps) {
  const [active, setActive] = useState(items[0]?.value);
  const [stuck, setStuck] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const scrolling = useRef(false);
  const values = items.map((item) => item.value);
  const key = values.join();

  /** How far from the top of the screen the tab bar sticks (below the mobile header, if any). */
  function stuckTop() {
    return bar.current ? parseFloat(getComputedStyle(bar.current).top) || 0 : 0;
  }

  useEffect(() => {
    function update() {
      // The tab bar is stuck once its natural position (the sentinel) has scrolled up to where it sticks.
      // 1px of slack so the bar never sits stuck without its header at the boundary.
      setStuck((sentinel.current?.getBoundingClientRect().top ?? 2) <= stuckTop() + 1);
      // Ignore the scroll events of a smooth scroll that a tab tap started.
      if (scrolling.current) return;
      // A section counts as the one being read once its top is in the upper third of the screen.
      const line = stuckTop() + (bar.current?.offsetHeight ?? 0) + window.innerHeight * 0.3;
      // Sections can be reordered or hidden per screen size, so go by where each one actually is.
      const shown = values
        .map((value) => ({ value, node: document.getElementById(value) }))
        .filter((entry): entry is { value: string; node: HTMLElement } => !!entry.node && entry.node.offsetParent !== null)
        .map(({ value, node }) => ({ value, top: node.getBoundingClientRect().top }))
        .sort((a, b) => a.top - b.top);
      let current = shown[0]?.value ?? values[0];
      for (const entry of shown) if (entry.top <= line) current = entry.value;
      // A short last section may never reach the bar, so the end of the page counts as reaching it.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActive(atBottom ? (shown[shown.length - 1]?.value ?? current) : current);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // `values` is derived from `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Keeps the highlighted tab visible when the bar scrolls sideways on a narrow screen. */
  function keepInView(tab: HTMLAnchorElement | null) {
    const nav = bar.current;
    if (!tab || !nav || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: tab.offsetLeft - (nav.clientWidth - tab.offsetWidth) / 2, behavior: "smooth" });
  }

  function go(event: MouseEvent, value: string) {
    const section = document.getElementById(value);
    if (!section) return;
    event.preventDefault();
    track("tab_change", { tab: value });
    scrolling.current = true;
    window.setTimeout(() => {
      scrolling.current = false;
    }, 800);
    setActive(value);
    // Stop a little short of the bar so a card's top border is not hidden under it.
    const top = section.getBoundingClientRect().top + window.scrollY - stuckTop() - (bar.current?.offsetHeight ?? 0) - 16;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <div className={cn("relative flex flex-col gap-4 lg:gap-8", className)}>
      {topBar && (
        <div
          inert={!stuck}
          className={cn(
            "fixed inset-x-0 top-0 z-40 h-14 bg-white transition-transform duration-200 lg:hidden",
            stuck ? "translate-y-0" : "-translate-y-full",
          )}
        >
          {topBar}
        </div>
      )}
      {/* Out of the flow, so the column's gap does not count it. */}
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" />
      <nav
        ref={bar}
        aria-label={label}
        className={cn(
          "sticky z-30 -mx-4 flex gap-6 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-line bg-white px-4 lg:top-[73px] lg:mx-0 lg:gap-8 lg:rounded-t-2xl lg:px-8",
          topBar ? "top-14" : "top-0",
        )}
      >
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <a
              key={item.value}
              href={`#${item.value}`}
              aria-current={selected ? "true" : undefined}
              ref={selected ? keepInView : undefined}
              onClick={(event) => go(event, item.value)}
              className={cn(
                item.className,
                "-mb-px shrink-0 border-b-2 py-2.5 text-body whitespace-nowrap transition-colors",
                selected
                  ? "border-primary font-semibold text-ink"
                  : "border-transparent font-medium text-muted hover:text-ink",
              )}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
      {items.map((item, i) => (
        <Fragment key={item.value}>
          {/* A divider of its own, not a border, so the column's gap spaces both sides of it alike. */}
          {i > 0 && <div aria-hidden className={cn("h-px bg-line", item.className)} />}
          <section id={item.value} className={cn(topBar ? "scroll-mt-28" : "scroll-mt-14", "lg:scroll-mt-32 lg:px-8", item.className)}>
            {item.content}
          </section>
        </Fragment>
      ))}
    </div>
  );
}
