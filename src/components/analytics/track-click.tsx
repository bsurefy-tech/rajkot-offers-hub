"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics/client";
import type { EventMap } from "@/lib/analytics/events";

/**
 * Sends an event when anything inside is clicked. For links and buttons drawn by server components, which cannot take
 * an `onClick`; the wrapper adds no box of its own.
 */
export function TrackClick<E extends keyof EventMap>({ event, properties, children }: { event: E; properties: EventMap[E]; children: ReactNode }) {
  return (
    <span onClickCapture={() => track(event, properties)} className="contents">
      {children}
    </span>
  );
}
