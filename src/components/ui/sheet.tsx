"use client";

import { X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

/** The sheet's sticky footer element, so a form inside the body can put its action button there. */
const FooterContext = createContext<HTMLElement | null>(null);

/**
 * Action buttons for the sheet this is in. They sit in the sticky footer at the bottom, outside the scrolling body.
 * A submit button in here must name its form (`form="…"`), because it is no longer inside it in the page.
 */
export function SheetFooter({ children }: { children: ReactNode }) {
  const footer = useContext(FooterContext);
  return footer ? createPortal(children, footer) : <>{children}</>;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** A line under the title, e.g. an item's category and rating. */
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** "lg": a wider dialog on desktop and a taller sheet on mobile, for content to look at (an item's photos and details). */
  size?: "md" | "lg";
  className?: string;
}

/** The round white close button that floats above a bottom sheet, centred; the desktop dialog has its own in the header. */
export function SheetClose({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={t("Close")}
      onClick={onClose}
      className="mx-auto mb-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white text-ink shadow-float lg:hidden"
    >
      <X size={20} aria-hidden />
    </button>
  );
}

/**
 * Bottom sheet on mobile, centred dialog on desktop. Built on <dialog>
 * so focus trapping, Escape and the backdrop come from the browser.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, size = "md", className }: SheetProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus the dialog itself, not its first control (the close button), so no focus ring shows on open.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      tabIndex={-1}
      onClose={(e) => {
        // React hands a dialog opened inside this one (a photo viewer) its close event too; only our own closes us.
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none bg-transparent p-0 outline-none backdrop:bg-ink/45",
        "lg:m-auto",
        size === "lg" ? "lg:max-w-[760px]" : "lg:max-w-[480px]",
        className,
      )}
    >
      <SheetClose onClose={onClose} />
      {/*
        On a phone the round close button sits above the panel, and the browser caps a dialog at the screen
        less 2em + 6px; taller than that and the dialog scrolls, hiding the close button or the footer. So the
        panel stays under the screen less 6rem (that cap plus the button), whatever its size.
      */}
      <div
        className={cn(
          "flex min-h-[60dvh] flex-col rounded-t-3xl bg-white lg:min-h-0 lg:rounded-2xl",
          size === "lg" ? "max-h-[min(92dvh,calc(100dvh-6rem))] lg:max-h-[88dvh]" : "max-h-[min(85dvh,calc(100dvh-6rem))] lg:max-h-[85dvh]",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 lg:px-6 lg:pt-5">
          <div className="min-w-0">
            <h2 className="text-heading font-semibold">{title}</h2>
            {subtitle && <div className="mt-0.5 text-body-sm text-muted">{subtitle}</div>}
          </div>
          <IconButton variant="soft" size="sm" aria-label={t("Close")} onClick={onClose} className="hidden lg:inline-flex">
            <X size={18} />
          </IconButton>
        </div>
        <FooterContext value={footerEl}>
          <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:pb-5">{children}</div>
        </FooterContext>
        <div
          ref={setFooterEl}
          className="shrink-0 border-t border-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] empty:hidden lg:px-6"
        >
          {footer}
        </div>
      </div>
    </dialog>
  );
}
