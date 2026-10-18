"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { SheetClose } from "@/components/ui/sheet";
import { useT } from "@/lib/i18n/client";

const DESKTOP = "(min-width: 1024px)";

/** Whether the viewport is desktop-wide; the map sits in the page there and in a drawer on a phone. */
export function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

interface MapDrawerProps {
  onClose: () => void;
  /** The search box and filter chips shown above the map. */
  header: ReactNode;
  children: ReactNode;
}

/**
 * The offers map on a phone: a tall bottom drawer with the search and filter chips on top and the
 * map filling the rest. Built on <dialog>, so focus trapping, Escape and the backdrop are the browser's.
 */
export function MapDrawer({ onClose, header, children }: MapDrawerProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={t("Map")}
      // A filter chip's own drawer closes inside this one, and React lets its close event bubble up here.
      onClose={(e) => e.target === e.currentTarget && onClose()}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 mt-auto max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-ink/45"
    >
      <SheetClose onClose={onClose} />
      <div className="flex h-[calc(100dvh-4.5rem)] flex-col rounded-t-3xl bg-white">
        <div className="flex flex-col gap-3 px-4 pt-5 pb-3">{header}</div>
        <div className="flex min-h-0 flex-1 flex-col pb-5">{children}</div>
      </div>
    </dialog>
  );
}
