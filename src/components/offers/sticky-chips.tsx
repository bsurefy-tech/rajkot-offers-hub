"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The mobile header is 56px (h-14) and the bar sticks right under it. */
const STICK_AT = 56;

/**
 * The filter chips. On a phone they sit on the page like any content, then stay under the header while the list
 * scrolls; only once they are stuck do they get a white background and a shadow. On desktop they are plain content.
 */
export function StickyChips({ children }: { children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const update = () => {
      const top = bar.current?.getBoundingClientRect().top ?? Infinity;
      setStuck(window.scrollY > 0 && top <= STICK_AT + 0.5);
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
    <div
      ref={bar}
      className={cn(
        "sticky top-14 z-20 -mx-4 flex flex-col gap-3 px-4 py-3 transition-[background-color,box-shadow] lg:static lg:mx-0 lg:p-0",
        stuck ? "bg-white/95 shadow-header backdrop-blur lg:bg-transparent lg:shadow-none lg:backdrop-blur-none" : "bg-transparent",
      )}
    >
      {children}
    </div>
  );
}
