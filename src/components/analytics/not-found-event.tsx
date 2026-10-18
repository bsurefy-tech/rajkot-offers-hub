"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";
import { PageMarker } from "./page-marker";

/** A page that does not exist: marks it as such (the address says nothing of it) and records where the visitor came from. */
export function NotFoundEvent() {
  useEffect(() => {
    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).host : "";
    } catch {
      // Not an address: counted as no referrer.
    }
    track("not_found", { referrer });
  }, []);
  return <PageMarker type="not_found" />;
}
