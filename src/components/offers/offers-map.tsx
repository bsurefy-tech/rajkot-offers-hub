"use client";

import "leaflet/dist/leaflet.css";
import Image from "next/image";
import { Link } from "@/components/i18n/link";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Marker } from "leaflet";
import type { OfferPin } from "@/types";
import { formatDistance } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import { createMap, pillIcon } from "@/lib/leaflet";
import { offerPath, shopPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

const SHOWN_OFFERS = 2;

/** What the pin says: the shop's first offer, as its value ("₹500 OFF"). */
const tag = (pin: OfferPin) => pin.offers[0].badge;

/**
 * The list's shops on an OpenStreetMap map, one pin per shop. Tapping a pin highlights it and
 * shows the shop's offers in a card over the map's bottom edge. Leaflet loads only when this mounts.
 */
export function OffersMap({ pins, total, fill, className }: { pins: OfferPin[]; total: number; /** Take the height and the full width the parent gives (edge to edge), instead of a fixed height in a rounded box. */ fill?: boolean; className?: string }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const mapCredits = t("Map credits");
  const offerCount = pins.reduce((sum, pin) => sum + pin.offers.length, 0);

  useEffect(() => {
    const el = box.current;
    if (!el || pins.length === 0) return;

    let map: import("leaflet").Map | undefined;
    let resizer: ResizeObserver | undefined;
    const abort = new AbortController();
    let cancelled = false;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const instance = createMap(L, el, mapCredits);
      map = instance;

      const markers: Marker[] = [];
      const choose = (index: number | null) => {
        markers.forEach((marker, i) => {
          marker.setIcon(pillIcon(L, tag(pins[i]), i === index, pins[i].offers.length - 1));
          marker.setZIndexOffset(i === index ? 1000 : 0);
        });
        setSelected(index);
      };

      const bounds = L.latLngBounds([]);
      pins.forEach((pin, index) => {
        const marker = L.marker([pin.lat, pin.lng], { icon: pillIcon(L, tag(pin), false, pin.offers.length - 1), title: pin.businessName, keyboard: true })
          .addTo(instance)
          .on("click", () => choose(index));
        markers.push(marker);
        bounds.extend([pin.lat, pin.lng]);
      });
      instance.on("click", () => choose(null));

      const fit = () => {
        if (pins.length > 1) instance.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: false });
        else instance.setView(bounds.getCenter(), 15, { animate: false });
      };
      fit();

      // The box can settle after the map starts (a drawer finishing its layout): redraw at the real size,
      // and re-fit the pins until the visitor has moved the map themselves.
      let touched = false;
      const touch = () => (touched = true);
      el.addEventListener("pointerdown", touch, { signal: abort.signal });
      el.addEventListener("wheel", touch, { signal: abort.signal, passive: true });
      resizer = new ResizeObserver(() => {
        instance.invalidateSize();
        if (!touched) fit();
      });
      resizer.observe(el);
    })();

    return () => {
      cancelled = true;
      resizer?.disconnect();
      abort.abort();
      map?.remove();
      setSelected(null);
    };
  }, [pins, mapCredits]);

  if (pins.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-5 py-16 text-center text-body-sm text-muted">
        {t("None of these offers has a place on the map yet.")}
      </p>
    );
  }

  const pin = selected === null ? undefined : pins[selected];
  return (
    <div className={cn("flex flex-col gap-3", fill && "min-h-0 flex-1", className)}>
      <div className={cn("relative isolate overflow-hidden", fill ? "min-h-0 flex-1 border-y border-line" : "rounded-2xl border border-line")}>
        <div
          ref={box}
          role="region"
          aria-label={t("Map")}
          className={cn("z-0 bg-surface map-stripes", fill ? "h-full" : "h-[62dvh] min-h-[420px] lg:h-[640px]")}
        />
        {pin && (
          <div className="absolute right-3 bottom-3 left-3 z-[1000] rounded-2xl border border-line bg-white p-3 shadow-card lg:right-auto lg:w-[380px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={shopPath(pin.businessSlug)} className="block truncate text-body font-semibold hover:underline">
                  {pin.businessName}
                </Link>
                <p className="truncate text-body-sm text-muted">
                  {pin.areaName}
                  {pin.distanceKm !== undefined && ` · ${formatDistance(pin.distanceKm, t)}`}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("Close")}
                onClick={() => setSelected(null)}
                className="-mt-1 -mr-1 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <ul className="mt-2 flex flex-col gap-2">
              {pin.offers.slice(0, SHOWN_OFFERS).map((offer) => (
                <li key={offer.urlSlug}>
                  <Link href={offerPath({ businessSlug: pin.businessSlug, urlSlug: offer.urlSlug })} className="flex items-center gap-3 rounded-xl hover:bg-surface">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                      <Image src={offer.image} alt="" fill sizes="56px" className={offer.imageIsLogo ? "object-contain p-2" : "object-cover"} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body-sm font-semibold text-primary">{offer.badge}</span>
                      <span className="line-clamp-2 text-body leading-snug">{offer.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {pin.offers.length > SHOWN_OFFERS && (
              <Link href={shopPath(pin.businessSlug)} className="mt-2 inline-block text-body-sm font-medium text-primary hover:underline">
                {t("See all {count} offers", { count: pin.offers.length })}
              </Link>
            )}
          </div>
        )}
      </div>
      {total > offerCount && (
        <p className={cn("text-center text-body-sm text-muted", fill && "px-5")}>{t("{shown} of {total} offers are on the map; the rest have no location yet.", { shown: offerCount, total })}</p>
      )}
    </div>
  );
}
