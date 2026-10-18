"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { trackOfferAction, type OfferEvent } from "@/lib/actions/offers";
import { track } from "@/lib/analytics/client";

/** Counts an action on an offer for the shop's stats (the API) and for analytics (OpenPanel); fire and forget. */
export function trackOffer(offerId: string | undefined, type: OfferEvent) {
  if (!offerId) return;
  void trackOfferAction(offerId, type);
  if (type === "detail_view") track("offer_view", { offer_id: offerId });
  else if (type === "share") track("offer_share", { offer_id: offerId });
  else track("offer_contact", { offer_id: offerId, kind: type });
}

/** Counts one detail view per page visit. */
export function TrackOfferView({ offerId }: { offerId: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === offerId) return;
    sent.current = offerId;
    trackOffer(offerId, "detail_view");
  }, [offerId]);
  return null;
}

/** A plain link (directions) that counts its tap. */
export function TrackedAnchor({ offerId, event, onClick, ...props }: ComponentProps<"a"> & { offerId?: string; event: OfferEvent }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        trackOffer(offerId, event);
        onClick?.(e);
      }}
    />
  );
}
