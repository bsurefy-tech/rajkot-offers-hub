"use client";

import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";
import type { CatalogItem } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { RatingInline } from "@/components/ui/rating";
import { formatRupees } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

/** Items shown before "See all". */
const PREVIEW = 4;

function CatalogCard({ item }: { item: CatalogItem }) {
  const t = useT();
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface text-faint">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill sizes="(min-width: 1024px) 200px, 50vw" className="object-cover" />
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
        <h3 className="line-clamp-2 text-body-sm leading-snug font-semibold">{item.name}</h3>
        {item.description && <p className="line-clamp-2 text-caption text-muted">{item.description}</p>}
        {item.rating && <RatingInline rating={item.rating} className="text-caption text-muted" />}
        <p className="mt-auto pt-1 text-body-sm font-semibold">
          {item.priceFrom !== undefined ? t("From {price}", { price: formatRupees(item.priceFrom) }) : <span className="font-medium text-muted">{t("Price on request")}</span>}
        </p>
      </div>
    </article>
  );
}

/** A shop's catalog: a few items, with the rest opened in place. */
export function Catalog({ items, total }: { items: CatalogItem[]; total: number }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, PREVIEW);
  return (
    <div>
      <h2 className="mb-3 text-heading font-semibold">{t("Catalog ({count})", { count: total })}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {shown.map((item) => (
          <CatalogCard key={item.id} item={item} />
        ))}
      </div>
      {!all && items.length > PREVIEW && (
        <button type="button" onClick={() => setAll(true)} className="mt-4 w-full cursor-pointer text-center text-body font-semibold text-primary hover:underline">
          {t("See all {count} items", { count: items.length })}
        </button>
      )}
    </div>
  );
}
