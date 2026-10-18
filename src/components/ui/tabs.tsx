"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
  /** "underline" (default); "segmented": a grey track with a raised white selected tab; "chips": small filter pills. */
  variant?: "underline" | "segmented" | "chips";
}

/** Tabs with arrow-key navigation (WAI-ARIA tabs pattern): underlined, segmented or as chips. */
export function Tabs({ items, defaultValue, className, listClassName, panelClassName, variant = "underline" }: TabsProps) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + items.length) % items.length;
    setActive(items[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        className={cn(
          variant === "underline" && "flex gap-7 border-b border-line lg:gap-8",
          variant === "segmented" && "flex w-full gap-1 rounded-full bg-canvas p-1 lg:inline-flex lg:w-auto",
          variant === "chips" && "flex gap-2",
          listClassName,
        )}
      >
        {items.map((item, i) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={`${id}-tab-${item.value}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${id}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "cursor-pointer transition-colors",
                variant === "underline" &&
                  cn(
                    "-mb-px border-b-2 pb-3 text-body",
                    selected ? "border-primary font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink",
                  ),
                variant === "segmented" &&
                  cn(
                    "h-11 flex-1 rounded-full px-2 text-body whitespace-nowrap sm:px-6 lg:flex-none",
                    selected ? "bg-white font-semibold text-ink shadow-card" : "font-medium text-muted hover:text-ink",
                  ),
                variant === "chips" &&
                  cn(
                    "h-[34px] rounded-full border px-3.5 text-body-sm font-medium",
                    selected ? "border-ink bg-ink text-white" : "border-input bg-white text-ink hover:border-ink",
                  ),
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.value}
          id={`${id}-panel-${item.value}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${item.value}`}
          hidden={item.value !== active}
          className={panelClassName}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
