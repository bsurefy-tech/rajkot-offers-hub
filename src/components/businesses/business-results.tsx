"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadMoreBusinessesAction, type BusinessListQuery } from "@/lib/actions/business-list";
import { useT } from "@/lib/i18n/client";
import type { BusinessSummary } from "@/types";
import { BusinessCardSkeleton, BusinessGrid } from "./business-card";

interface BusinessResultsProps {
  /** What the list is filtered by, so later pages match it. */
  query: BusinessListQuery;
  initialItems: BusinessSummary[];
  /** The page `initialItems` runs up to. */
  initialPage: number;
  initialHasMore: boolean;
  /** Link to the next page, for visitors without JavaScript. */
  nextHref: string;
}

/** The shops of a list, loading the next page as the visitor nears the bottom. Remount (by `key`) when the filters change. */
export function BusinessResults({ query, initialItems, initialPage, initialHasMore, nextHref }: BusinessResultsProps) {
  const t = useT();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    try {
      const next = await loadMoreBusinessesAction(query, page + 1);
      setItems((current) => {
        const seen = new Set(current.map((business) => business.slug));
        return [...current, ...next.items.filter((business) => !seen.has(business.slug))];
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
    if (!el || !hasMore || failed) return;
    // Observing again after every page also catches a sentinel that is still on screen.
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: "600px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, failed, loadMore, items.length]);

  return (
    <div>
      <BusinessGrid businesses={items} />
      {hasMore && (
        <div ref={sentinel} className="mt-6 lg:mt-10">
          {failed ? (
            <div className="flex flex-col items-center gap-3 text-body-sm text-muted">
              {t("We could not load more shops.")}
              <Button type="button" variant="outline" onClick={() => void loadMore()}>
                {t("Try again")}
              </Button>
            </div>
          ) : (
            <div role="status" aria-label={t("Loading more shops")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <BusinessCardSkeleton />
              <BusinessCardSkeleton />
            </div>
          )}
          <noscript>
            <a href={nextHref} className="block text-center text-body font-medium text-primary">
              {t("Show more shops")}
            </a>
          </noscript>
        </div>
      )}
    </div>
  );
}
