"use client";

import { useEffect, useState } from "react";
import { useFollowedShops } from "@/hooks/use-saved";
import { followedOffersAction } from "@/lib/actions/followed-offers";
import { useT } from "@/lib/i18n/client";
import type { OfferSummary } from "@/types";
import { OfferCarousel } from "./offer-card";

/**
 * "From shops you follow": their newest offers, put first. Nothing for a guest, or for a visitor who follows
 * no shop or whose shops have no live offer. `framed` wraps it in a page section (the home page).
 */
export function FollowedOffers({ framed, className }: { framed?: boolean; className?: string }) {
  const t = useT();
  const { saved, ready, member } = useFollowedShops();
  const [offers, setOffers] = useState<OfferSummary[]>([]);
  // Reload when the follows change (a shop followed here or elsewhere).
  const key = saved.join("|");

  useEffect(() => {
    if (!ready || !member || !key) return;
    let current = true;
    void followedOffersAction(saved).then((items) => current && setOffers(items));
    return () => {
      current = false;
    };
    // `saved` is what `key` is made of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, member, key]);

  if (!ready || !member || !key || !offers.length) return null;

  const content = (
    <div className={className}>
      <h2 className="mb-4 text-page leading-[1.3] font-semibold lg:mb-7">{t("From shops you follow")}</h2>
      <OfferCarousel offers={offers} />
    </div>
  );
  // Not `Section`/`Container`: that module is server-only, and this is a client component.
  return framed ? (
    <section className="bg-white py-8 lg:py-12">
      <div className="mx-auto w-full max-w-[1240px] px-5">{content}</div>
    </section>
  ) : (
    content
  );
}
