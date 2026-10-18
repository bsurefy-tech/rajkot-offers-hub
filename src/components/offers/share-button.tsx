"use client";

import { Link2, Share2 } from "lucide-react";
import { useState } from "react";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { localizePath } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { site } from "@/lib/site";
import { trackOffer } from "./track";

interface ShareButtonProps {
  title: string;
  /** Path of the page to share, e.g. "/offers/kurta-20-off". */
  path: string;
  variant?: "floating" | "plain" | "text" | "pill" | "tile" | "bar";
  /** On an offer page: a share counts towards that offer's stats. */
  offerId?: string;
}

/** Uses the system share sheet when there is one, else our own sheet. */
export function ShareButton({ title, path, variant = "floating", offerId }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const t = useT();
  const locale = useLocale();
  const url = `${site.url}${localizePath(locale, path)}`;

  async function onShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        trackOffer(offerId, "share");
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      trackOffer(offerId, "share");
      toast(t("Link copied"));
    } catch {
      toast(t("Could not copy the link"));
    }
    setOpen(false);
  }

  const options = [
    {
      label: "WhatsApp",
      icon: <WhatsAppIcon size={22} />,
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    { label: "Instagram", icon: <InstagramIcon size={22} />, href: "https://instagram.com" },
  ];

  return (
    <>
      {variant === "floating" || variant === "plain" ? (
        <IconButton variant={variant} size="lg" aria-label={t("Share")} onClick={onShare}>
          <Share2 size={20} aria-hidden />
        </IconButton>
      ) : variant === "tile" ? (
        <Button variant="outline" size="sm" block className="px-0" onClick={onShare}>
          <Share2 size={18} aria-hidden />
          <span className="sr-only">{t("Share")}</span>
        </Button>
      ) : variant === "bar" ? (
        <Button variant="outline" size="sm" onClick={onShare} className="min-w-0 flex-1 px-2">
          <Share2 size={18} aria-hidden />
          {t("Share")}
        </Button>
      ) : variant === "pill" ? (
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 size={16} aria-hidden />
          {t("Share")}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={onShare} className="px-2">
          <Share2 size={18} aria-hidden />
          {t("Share")}
        </Button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={t("Share with friends")}>
        <div className="grid grid-cols-3 gap-3">
          {options.map((option) => (
            <a
              key={option.label}
              href={option.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                trackOffer(offerId, "share");
                setOpen(false);
              }}
              className="flex flex-col items-center gap-2 rounded-2xl bg-surface py-4 text-caption font-medium hover:bg-canvas"
            >
              {option.icon}
              {option.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copyLink}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl bg-surface py-4 text-caption font-medium hover:bg-canvas"
          >
            <Link2 size={22} aria-hidden />
            {t("Copy link")}
          </button>
        </div>
        <p className="mt-4 truncate rounded-xl border border-line px-3.5 py-3 text-body-sm text-muted">
          {url.replace(/^https?:\/\//, "")}
        </p>
      </Sheet>
    </>
  );
}
