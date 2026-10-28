"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import { createMap, pinIcon } from "@/lib/leaflet";
import { cn, directionsHref } from "@/lib/utils";

export interface MapOutlet {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** The highlighted pin: the shop's main outlet. */
  main: boolean;
  /** Shown on the pin when the shop has several outlets, matching the outlet list beside the map. */
  number?: number;
}

/**
 * OpenStreetMap showing the shop's outlets, the main one highlighted. Leaflet is only loaded
 * on screens wide enough to show the map (desktop), and only when the card scrolls into view.
 */
export function OutletMap({ outlets, className }: { outlets: MapOutlet[]; className?: string }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const directions = t("Directions");
  const mapCredits = t("Map credits");

  useEffect(() => {
    const el = box.current;
    if (!el || outlets.length === 0 || !window.matchMedia("(min-width: 1024px)").matches) return;

    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    async function start(target: HTMLElement) {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      const instance = createMap(L, target, mapCredits);
      map = instance;

      const many = outlets.length > 1;
      const bounds = L.latLngBounds([]);
      let highlighted: import("leaflet").Marker | undefined;
      // The highlighted pin is drawn last so it sits above its neighbours.
      [...outlets].sort((a, b) => Number(a.main) - Number(b.main)).forEach((outlet) => {
        const number = outlet.number ?? null;
        const icon = pinIcon(L, outlet.main, number);
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = outlet.name;
        const address = document.createElement("p");
        address.textContent = outlet.address;
        address.style.margin = "4px 0 6px";
        const link = document.createElement("a");
        link.href = directionsHref(outlet.lat, outlet.lng);
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = directions;
        link.style.color = "#e11654";
        link.style.fontWeight = "600";
        popup.append(name, address, link);
        const marker = L.marker([outlet.lat, outlet.lng], { icon, title: outlet.name, zIndexOffset: outlet.main ? 1000 : 0 }).addTo(instance).bindPopup(popup);
        if (outlet.main) highlighted = marker;
        bounds.extend([outlet.lat, outlet.lng]);
      });

      if (many) instance.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
      else instance.setView(bounds.getCenter(), 15);
      // A shop with one outlet shows its name and address right away; with several, the crimson pin does the highlighting.
      if (!many) highlighted?.openPopup();
    }

    // Wait until the card is near the screen so the map's code and tiles are not fetched for nothing.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        void start(el);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      map?.remove();
    };
  }, [outlets, directions, mapCredits]);

  return <div ref={box} role="region" aria-label={t("Map")} className={cn("relative isolate z-0 h-[260px] bg-surface map-stripes", className)} />;
}
