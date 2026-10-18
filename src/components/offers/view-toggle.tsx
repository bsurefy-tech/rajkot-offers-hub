"use client";

import { List, Map } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics/client";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type OffersView = "list" | "map";

const ViewContext = createContext<{ view: OffersView; setView: (view: OffersView) => void } | null>(null);

/** Holds whether the offers show as a list or on a map, so the switch and the results can sit apart. */
export function ViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<OffersView>("list");
  return <ViewContext value={{ view, setView }}>{children}</ViewContext>;
}

export function useOffersView() {
  const context = useContext(ViewContext);
  if (!context) throw new Error("useOffersView must be used inside <ViewProvider>");
  return context;
}

/** "List" and "Map" with their icons; the chosen one is dark. */
export function ViewToggle({ className }: { className?: string }) {
  const t = useT();
  const { view, setView } = useOffersView();
  const button = (value: OffersView, label: string, Icon: typeof List) => (
    <button
      type="button"
      aria-pressed={view === value}
      onClick={() => {
        if (view !== value) track("view_toggle", { view: value });
        setView(value);
      }}
      className={cn(
        "inline-flex h-full cursor-pointer items-center justify-center gap-1.5 px-4 text-body font-medium",
        view === value ? "bg-ink text-white" : "bg-white text-ink hover:bg-surface",
      )}
    >
      <Icon size={18} aria-hidden />
      {label}
    </button>
  );
  return (
    <div role="group" aria-label={t("View")} className={cn("flex h-[38px] shrink-0 overflow-hidden rounded-full border border-input", className)}>
      {button("list", t("List"), List)}
      {button("map", t("Map"), Map)}
    </div>
  );
}

/** On a phone the switch floats in the middle, above the bottom menu and clear of its raised Zalak button, so it stays in reach while the list scrolls. */
export function FloatingViewToggle() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom)+2.25rem)] z-30 flex justify-center lg:hidden">
      <ViewToggle className="pointer-events-auto h-11 rounded-full shadow-card" />
    </div>
  );
}
