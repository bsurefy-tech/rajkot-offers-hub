"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";
import type { CatalogItem } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { RatingInline } from "@/components/ui/rating";
import { formatRupees } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { AskButton, CatalogItemSheet, type CatalogShop } from "./catalog-item-sheet";

/** Items shown before "See all": two full rows, of two on a phone and of three from tablet up. */
const PREVIEW = 4;
const PREVIEW_WIDE = 6;

/** One item: tapping it opens its details; its button asks the shop on WhatsApp for the price, or about the item when it has one. */
function CatalogCard({ item, shop, onOpen, className }: { item: CatalogItem; shop: CatalogShop; onOpen: () => void; className?: string }) {
  const t = useT();
  return (
    <article className={cn("relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition-colors hover:border-line-strong", className)}>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface text-faint">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw" className="object-cover" />
        ) : (
          <Package size={32} strokeWidth={1.4} aria-hidden />
        )}
        {item.featured && (
          <Badge variant="neutral" size="xs" className="absolute top-2 left-2 border border-line bg-white text-ink">
            {t("Featured")}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3 pt-2.5 pb-3">
        <h3 className="line-clamp-2 text-body-sm leading-snug font-semibold">
          {/* Stretched over the whole card, so a tap anywhere opens the details. */}
          <button type="button" onClick={onOpen} className="cursor-pointer text-left after:absolute after:inset-0">
            {item.name}
          </button>
        </h3>
        {item.description && <p className="line-clamp-2 text-caption text-muted">{item.description}</p>}
        {item.rating && <RatingInline rating={item.rating} className="text-caption text-muted" />}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          {item.priceFrom !== undefined && <p className="text-body-sm font-semibold">{t("From {price}", { price: formatRupees(item.priceFrom) })}</p>}
          <AskButton
            item={item}
            shop={shop}
            priced={item.priceFrom !== undefined}
            iconSize={15}
            className="relative z-10 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-whatsapp bg-whatsapp-soft px-2 text-caption font-semibold text-whatsapp-ink hover:bg-whatsapp/15"
          />
        </div>
      </div>
    </article>
  );
}

/** A shop's catalog: a few items, with the rest opened in place. */
export function Catalog({ items, total, shop }: { items: CatalogItem[]; total: number; shop: CatalogShop }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<CatalogItem | null>(null);
  const shown = all ? items : items.slice(0, PREVIEW_WIDE);
  return (
    <div>
      <h2 className="in-data-first:sr-only mb-3 text-heading font-semibold">{t("Catalog ({count})", { count: total })}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        {shown.map((item, i) => (
          <CatalogCard key={item.id} item={item} shop={shop} onOpen={() => setOpen(item)} className={!all && i >= PREVIEW ? "max-sm:hidden" : undefined} />
        ))}
      </div>
      {!all && items.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className={cn("mt-4 w-full cursor-pointer text-center text-body font-semibold text-primary hover:underline", items.length <= PREVIEW_WIDE && "sm:hidden")}
        >
          {t("See all {count} items", { count: items.length })}
        </button>
      )}
      <CatalogItemSheet item={open} shop={shop} onClose={() => setOpen(null)} />
    </div>
  );
}
