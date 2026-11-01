"use client";

import { ChevronLeft, ChevronRight, FileText, Package, Phone } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/icons/brand";
import { buttonClass } from "@/components/ui/button";
import { RatingInline } from "@/components/ui/rating";
import { Sheet } from "@/components/ui/sheet";
import { loadCatalogItemAction } from "@/lib/actions/catalog";
import type { CatalogItem, CatalogItemDetail, CatalogPrice } from "@/lib/data/catalog";
import { formatRupees } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { ContactLink } from "./contact-link";
import { PhotoViewer } from "./photo-gallery";

/** The shop a catalog belongs to, for its contact buttons. */
export interface CatalogShop {
  id: string;
  slug: string;
  name: string;
  phone: string;
  whatsapp: string;
  contactMasked: boolean;
}

const KIND: Record<CatalogPrice["kind"], MessageKey> = { sale: "Buy", rent: "Rent", book: "Book", enquire: "Price" };
const UNIT: Partial<Record<CatalogPrice["unit"], MessageKey>> = { hour: "/ hour", day: "/ day", night: "/ night", person: "/ person", event: "/ event" };

/** Details read in this tab, so opening an item again shows them at once. */
const cache = new Map<string, CatalogItemDetail | null>();

/** WhatsApp the shop about one item: ask its price, or whether it is available when it has one. */
export function AskButton({ item, shop, priced, className, iconSize = 18 }: { item: CatalogItem; shop: CatalogShop; priced: boolean; className?: string; iconSize?: number }) {
  const t = useT();
  const vars = { item: item.name, shop: shop.name };
  const text = priced ? t("Enquire") : t("Ask for price");
  return (
    <ContactLink
      business={shop.slug}
      kind="whatsapp"
      number={shop.whatsapp}
      masked={shop.contactMasked}
      message={priced ? t("Hi, I saw {item} at {shop} on Rajkot Offers Hub. Is it available?", vars) : t("Hi, I saw {item} at {shop} on Rajkot Offers Hub. What is the price?", vars)}
      label={text}
      className={className}
    >
      <WhatsAppIcon size={iconSize} />
      {text}
    </ContactLink>
  );
}

function PriceRow({ price }: { price: CatalogPrice }) {
  const t = useT();
  const unit = UNIT[price.unit];
  let text = t("Price on request");
  if (price.amount) {
    const amount = formatRupees(price.amount);
    text = price.max ? `${amount} – ${formatRupees(price.max)}` : price.from ? t("From {price}", { price: amount }) : amount;
  }
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-body text-muted">{t(KIND[price.kind])}</dt>
      <dd className="text-right">
        {price.was && <span className="mr-2 text-body-sm text-faint line-through">{formatRupees(price.was)}</span>}
        <span className={cn("text-title font-semibold", !price.amount && "text-body font-medium text-muted")}>{text}</span>
        {price.amount && unit && <span className="ml-1 text-body-sm text-muted">{t(unit)}</span>}
      </dd>
    </div>
  );
}

/**
 * The item's photos one at a time, each shown whole: swipe, or the arrows, to move; tap for full
 * screen. A counter says which one of how many.
 */
function Carousel({ images, alt, onOpen }: { images: string[]; alt: string; onOpen: (index: number) => void }) {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const many = images.length > 1;

  function go(to: number) {
    const el = track.current;
    if (el && to >= 0 && to < images.length) el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface">
      <div
        ref={track}
        onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={t("Photo {number}", { number: i + 1 })}
            onClick={() => onOpen(i)}
            className="relative aspect-[4/3] w-full shrink-0 cursor-zoom-in snap-center"
          >
            <Image src={src} alt={i === 0 ? alt : ""} fill sizes="(min-width: 1024px) 360px, 100vw" className="object-contain" />
          </button>
        ))}
      </div>
      {many && (
        <>
          {[
            { label: t("Previous"), to: active - 1, Icon: ChevronLeft, side: "left-2" },
            { label: t("Next"), to: active + 1, Icon: ChevronRight, side: "right-2" },
          ].map(({ label, to, Icon, side }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              disabled={to < 0 || to >= images.length}
              onClick={() => go(to)}
              className={cn("absolute top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-ink shadow-float disabled:invisible", side)}
            >
              <Icon size={20} aria-hidden />
            </button>
          ))}
          <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-caption font-medium text-white tabular-nums">
            {active + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * A catalog item's details in a popup: its photos (tap for full screen), its description, prices,
 * what it comes in and its details, and buttons to call or WhatsApp the shop about it. The card's own
 * information shows at once; the rest loads as it opens.
 */
export function CatalogItemSheet({ item, shop, onClose }: { item: CatalogItem | null; shop: CatalogShop; onClose: () => void }) {
  const t = useT();
  const [loaded, setLoaded] = useState<{ id: string; detail: CatalogItemDetail | null }>();
  const [photo, setPhoto] = useState<number | null>(null);

  useEffect(() => {
    if (!item) return;
    const known = cache.get(item.id);
    let live = true;
    const read = known !== undefined ? Promise.resolve(known) : loadCatalogItemAction(shop.id, item.id).catch(() => null);
    void read.then((detail) => {
      if (detail) cache.set(item.id, detail);
      if (live) setLoaded({ id: item.id, detail });
    });
    return () => {
      live = false;
    };
  }, [item, shop.id]);

  const detail = item && loaded?.id === item.id ? loaded.detail : undefined;
  const loading = !!item && loaded?.id !== item.id;
  const images = detail?.images.length ? detail.images : item?.image ? [item.image] : [];
  const prices = detail?.prices ?? [];
  const priced = detail ? prices.some((p) => p.amount) : item?.priceFrom !== undefined;

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item?.name ?? ""}
      subtitle={
        (item?.categoryName || item?.rating) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.categoryName}
            {item.rating && <RatingInline rating={item.rating} />}
          </span>
        )
      }
      size="lg"
      footer={
        item && (
          <div className="flex gap-3">
            <ContactLink business={shop.slug} kind="call" number={shop.phone} masked={shop.contactMasked} className={buttonClass({ variant: "outline", className: "flex-1" })}>
              <Phone size={18} aria-hidden />
              {t("Call")}
            </ContactLink>
            <AskButton item={item} shop={shop} priced={priced} className={buttonClass({ variant: "whatsappSolid", className: "flex-[2]" })} />
          </div>
        )
      }
    >
      {item && (
        // Phone: one column. Desktop: the photos on the left, the rest beside them.
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          {images.length > 0 ? (
            <Carousel images={images} alt={item.name} onOpen={setPhoto} />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-surface text-faint">
              <Package size={40} strokeWidth={1.4} aria-hidden />
            </div>
          )}

          <div className="flex flex-col gap-5 lg:sticky lg:top-0">
            {item.description && <p className="text-body leading-relaxed">{item.description}</p>}
            {detail?.about && detail.about !== item.description && <p className="text-body-sm leading-relaxed whitespace-pre-line text-muted">{detail.about}</p>}

            {loading ? (
              <div aria-hidden className="flex flex-col gap-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-skeleton" />
                <div className="h-4 w-full animate-pulse rounded bg-skeleton" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-skeleton" />
              </div>
            ) : prices.length ? (
              <dl className="divide-y divide-line rounded-xl border border-line px-4">
                {prices.map((price, i) => (
                  <PriceRow key={i} price={price} />
                ))}
              </dl>
            ) : (
              <p className="text-title font-semibold">
                {item.priceFrom !== undefined ? t("From {price}", { price: formatRupees(item.priceFrom) }) : <span className="text-body font-medium text-muted">{t("Price on request")}</span>}
              </p>
            )}

            {detail && (detail.options.length > 0 || detail.details.length > 0) && (
              <section>
                <h3 className="mb-1 text-title font-semibold">{t("Details")}</h3>
                <dl className="divide-y divide-line">
                  {[...detail.options.map((o) => ({ label: o.label, value: o.values.join(", ") })), ...detail.details].map((row) => (
                    <div key={row.label} className="flex justify-between gap-4 py-2.5 text-body">
                      <dt className="text-muted">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {detail?.brochure && (
              <a href={detail.brochure.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface">
                <FileText size={22} aria-hidden className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-medium">{t("View brochure")}</span>
                  {detail.brochure.name && <span className="block truncate text-caption text-muted">{detail.brochure.name}</span>}
                </span>
              </a>
            )}

            {detail === null && <p className="text-body-sm text-muted">{t("Could not load the details.")}</p>}
          </div>

          <PhotoViewer images={images} alt={item.name} index={photo} onClose={() => setPhoto(null)} />
        </div>
      )}
    </Sheet>
  );
}
