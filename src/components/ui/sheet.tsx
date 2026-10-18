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
  children: ReactNode;
  footer?: ReactNode;
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
export function Sheet({ open, onClose, title, children, footer, className }: SheetProps) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [footerEl, setFooterEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-ink/45",
        "lg:m-auto lg:max-w-[480px]",
        className,
      )}
    >
      <SheetClose onClose={onClose} />
      <div className="flex max-h-[85dvh] min-h-[60dvh] flex-col rounded-t-3xl bg-white lg:min-h-0 lg:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-4 lg:px-6 lg:pt-5">
          <h2 className="text-heading font-semibold">{title}</h2>
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
