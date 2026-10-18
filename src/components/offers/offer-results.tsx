"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { OfferPin, OfferSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { loadMoreOffersAction, loadOfferPinsAction, type OfferListQuery } from "@/lib/actions/offer-list";
import { useT } from "@/lib/i18n/client";
import { OfferCardSkeleton, OfferGrid } from "./offer-card";
import { MapDrawer, useIsDesktop } from "./map-drawer";
import { OffersMap } from "./offers-map";
import { useOffersView } from "./view-toggle";

interface OfferResultsProps {
  /** What the list is filtered by, so later pages and the map match it. */
  query: OfferListQuery;
  initialItems: OfferSummary[];
  /** The page `initialItems` runs up to. */
  initialPage: number;
  initialHasMore: boolean;
  total: number;
  /** Link to the next page, for visitors without JavaScript. */
  nextHref: string;
  /** The search and filter chips shown above the map when it opens in a drawer on a phone. */
  mapHeader?: ReactNode;
}

/**
 * The results as a list or a map, as chosen with the View toggle. The list loads its next page as the visitor
 * nears the bottom; the map reads its pins the first time it is opened. On a phone the map opens in a
 * drawer over the list. Remount (by `key`) when the filters change.
 */
export function OfferResults({ query, initialItems, initialPage, initialHasMore, total, nextHref, mapHeader }: OfferResultsProps) {
  const t = useT();
  const { view, setView } = useOffersView();
  const isDesktop = useIsDesktop();
  // The list stays in the page behind the phone's map drawer.
  const showList = view === "list" || !isDesktop;
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<{ pins: OfferPin[]; total: number } | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      const next = await loadMoreOffersAction(query, page + 1);
      setItems((current) => {
        const seen = new Set(current.map((offer) => offer.slug));
        return [...current, ...next.items.filter((offer) => !seen.has(offer.slug))];
      });
      setPage((current) => current + 1);
      setHasMore(next.hasMore);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
    }
  }, [query, page]);

  useEffect(() => {
    const el = sentinel.current;
    if (!showList || !el || !hasMore || failed) return;
    // Observing again after every page also catches a sentinel that is still on screen.
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: "600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showList, hasMore, failed, loadMore, items.length]);

  useEffect(() => {
    if (view !== "map" || pins || mapFailed) return;
    let cancelled = false;
    loadOfferPinsAction(query).then(
      (data) => !cancelled && setPins(data),
      () => !cancelled && setMapFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [view, pins, mapFailed, query]);

  const mapBody = (fill: boolean) =>
    pins ? (
      <OffersMap pins={pins.pins} total={pins.total || total} fill={fill} />
    ) : mapFailed ? (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-16 text-body-sm text-muted">
        {t("We could not load the map.")}
        <Button type="button" variant="outline" onClick={() => setMapFailed(false)}>
          {t("Try again")}
        </Button>
      </div>
    ) : (
      <div
        role="status"
        aria-label={t("Loading the map")}
        className={fill ? "min-h-0 flex-1 animate-pulse bg-surface" : "h-[62dvh] min-h-[420px] animate-pulse rounded-2xl bg-surface lg:h-[640px]"}
      />
    );

  return (
    <>
      {showList && (
        <div>
          <OfferGrid offers={items} columns={4} />
          {hasMore && (
            <div ref={sentinel} className="mt-6 lg:mt-10">
              {failed ? (
                <div className="flex flex-col items-center gap-3 text-body-sm text-muted">
                  {t("We could not load more offers.")}
                  <Button type="button" variant="outline" onClick={() => void loadMore()}>
                    {t("Try again")}
                  </Button>
                </div>
              ) : (
                <div role="status" aria-label={t("Loading more offers")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                  <OfferCardSkeleton />
                  <OfferCardSkeleton />
                </div>
              )}
              <noscript>
                <a href={nextHref} className="block text-center text-body font-medium text-primary">
                  {t("Show more offers")}
                </a>
              </noscript>
            </div>
          )}
        </div>
      )}
      {view === "map" &&
        (isDesktop ? (
          <div>{mapBody(false)}</div>
        ) : (
          <MapDrawer onClose={() => setView("list")} header={mapHeader}>
            {mapBody(true)}
          </MapDrawer>
        ))}
    </>
  );
}
