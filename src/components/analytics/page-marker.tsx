"use client";

import { useLayoutEffect } from "react";
import { setGlobalProperties } from "@/lib/analytics/client";
import type { PageType } from "@/lib/analytics/page-type";

/**
 * What a page knows and its address does not: the shop, category and area it is about, and whether `/<x>` is a shop.
 * Everything sent from the page afterwards carries them. `Analytics` clears them when the address changes.
 */
export function PageMarker({ type, shop, category, area }: { type: PageType; shop?: string; category?: string; area?: string }) {
  useLayoutEffect(() => {
    setGlobalProperties({ page_type: type, shop, category, area });
  }, [type, shop, category, area]);
  return null;
}
