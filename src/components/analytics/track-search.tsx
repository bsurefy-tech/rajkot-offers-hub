"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

/** The last search sent, so React's development double-run (and a re-render of the same results) counts once. */
let sent = "";

/** One `search` event per search shown: how long the words were and how many offers they found, not the words. */
export function TrackSearch({ q, results }: { q: string; results: number }) {
  useEffect(() => {
    const key = `${q.length}:${results}:${location.href}`;
    if (key === sent) return;
    sent = key;
    track("search", { q_length: q.length, results });
  }, [q, results]);
  return null;
}
