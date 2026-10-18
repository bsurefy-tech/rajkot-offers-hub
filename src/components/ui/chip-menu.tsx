"use client";

import { Link } from "@/components/i18n/link";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { chipClass } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { PICK_LOCATION_EVENT } from "@/lib/location";
import { cn } from "@/lib/utils";

export interface ChipMenuOption {
  key: string;
  label: string;
  selected: boolean;
  /** Where choosing the option goes; filters live in the URL so every state can be shared. */
  href?: string;
  /** Instead of a link: opens the location picker (for "Nearest first" before a location is set). */
  pickLocation?: boolean;
}

interface ChipMenuProps {
  /** What the chip filters by: "Category". Followed by the choice once one is made. */
  label: string;
  options: ChipMenuOption[];
  /** The chosen option's label, when it is not the default; turns the chip dark. */
  value?: string;
  className?: string;
}

const DESKTOP = "(min-width: 1024px)";

/**
 * A filter chip that opens its choices: a drop-down under the chip on desktop, a bottom
 * drawer on a phone. Choosing one navigates to its link and closes the picker.
 */
export function ChipMenu({ label, options, value, className }: ChipMenuProps) {
  const [open, setOpen] = useState<"popover" | "sheet" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open !== "popover") return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((current) => (current ? null : window.matchMedia(DESKTOP).matches ? "popover" : "sheet"));
  }

  const choices = (
    <ul role="listbox" aria-label={label} className="flex flex-col">
      {options.map((option) => {
        const row = cn(
          "flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 text-left text-body",
          "lg:min-h-10 lg:rounded-[10px] lg:px-3 lg:text-body lg:hover:bg-surface",
          option.selected && "font-semibold lg:bg-surface",
        );
        const mark = (
          <>
            {option.label}
            {/* A radio on the phone drawer, a tick in the desktop menu. */}
            <span
              aria-hidden
              className={cn(
                "size-5 shrink-0 rounded-full border-2 border-input lg:hidden",
                option.selected && "border-[6px] border-primary",
              )}
            />
            {option.selected && <Check size={16} strokeWidth={2.5} className="hidden shrink-0 lg:block" aria-hidden />}
          </>
        );
        return (
          <li key={option.key} role="option" aria-selected={option.selected} className="border-b border-line last:border-0 lg:border-0">
            {option.href ? (
              <Link href={option.href} scroll={false} onClick={() => setOpen(null)} className={row}>
                {mark}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  if (option.pickLocation) window.dispatchEvent(new CustomEvent(PICK_LOCATION_EVENT));
                }}
                className={row}
              >
                {mark}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={ref} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        aria-haspopup={open === "popover" ? "listbox" : "dialog"}
        aria-expanded={open !== null}
        onClick={toggle}
        className={chipClass({ selected: Boolean(value), size: "md" }, "h-8 px-3 lg:h-[38px] lg:px-[18px] lg:text-body")}
      >
        {value ? `${label} · ${value}` : label}
        <ChevronDown size={14} className={cn("transition-transform", open === "popover" && "rotate-180")} aria-hidden />
      </button>
      {open === "popover" && (
        <div className="absolute top-full left-0 z-30 mt-2 max-h-[min(60dvh,420px)] w-[240px] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-card">
          {choices}
        </div>
      )}
      <Sheet open={open === "sheet"} onClose={() => setOpen((current) => (current === "sheet" ? null : current))} title={label} className="lg:hidden">
        {open === "sheet" && choices}
      </Sheet>
    </div>
  );
}
