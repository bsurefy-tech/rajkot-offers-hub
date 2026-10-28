"use client";

import { ChevronRight, MapPin, Store } from "lucide-react";
import { useState } from "react";
import { Link } from "@/components/i18n/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { track } from "@/lib/analytics/client";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface StoreButtonProps {
  /** Public path of the shop's page. */
  href: string;
  name: string;
  outlets: { id: string; name: string; address: string; isMain: boolean }[];
  /** The shop's slug, for analytics. */
  shop: string;
  className?: string;
}

/** "Store" button for the offer page's bottom bar: one outlet goes straight to the shop; several open a sheet listing them. */
export function StoreButton({ href, name, outlets, shop, className }: StoreButtonProps) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const style = cn("min-w-0 flex-1 px-2", className);

  if (outlets.length <= 1) {
    return (
      <ButtonLink href={href} size="sm" onClick={() => track("store_open", { shop, outlets: outlets.length })} className={style}>
        <Store size={18} aria-hidden />
        {t("Store")}
      </ButtonLink>
    );
  }

  return (
    <>
      <Button size="sm" aria-haspopup="dialog"
        onClick={() => {
          track("store_open", { shop, outlets: outlets.length });
          setOpen(true);
        }}
        className={style}
      >
        <Store size={18} aria-hidden />
        {t("Store")}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name}>
        <ul className="flex flex-col gap-3">
          {outlets.map((outlet) => (
            <li key={outlet.id}>
              <Link href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl border border-line p-4 transition-colors hover:bg-surface">
                <MapPin size={20} aria-hidden className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">
                    {outlet.name}
                    {outlet.isMain && !/main/i.test(outlet.name) && <span className="ml-2 text-caption font-medium text-muted">{t("Main outlet")}</span>}
                  </span>
                  <span className="block text-body-sm text-muted">{outlet.address}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
