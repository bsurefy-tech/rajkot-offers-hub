"use client";

import { Bookmark, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { savedOfferCards } from "@/lib/actions/saves";
import type { OfferSummary } from "@/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useSavedOffers } from "@/hooks/use-saved";
import { ENDING_SOON_DAYS, formatEndsIn } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { OfferCard, OfferGridSkeleton } from "./offer-card";

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">{children}</div>;
}

/** Saved offers, split into active and expired tabs. Cards are fetched for the offers saved on the account. */
export function SavedOffers() {
  const t = useT();
  const locale = useLocale();
  const { saved, ready, remove, restore } = useSavedOffers();
  const toast = useToast();
  const [offers, setOffers] = useState<OfferSummary[] | null>(null);
  const key = saved.join("|");

  useEffect(() => {
    let current = true;
    savedOfferCards(key ? key.split("|") : []).then((cards) => current && setOffers(cards), () => current && setOffers([]));
    return () => {
      current = false;
    };
  }, [key]);

  if (!ready || (saved.length > 0 && offers === null)) {
    // The Live / Expired chips and the grid, as they stand once the cards are in.
    return (
      <>
        <div aria-hidden className="flex gap-2">
          <Skeleton className="h-[34px] w-24 rounded-full" />
          <Skeleton className="h-[34px] w-28 rounded-full" />
        </div>
        <div className="pt-4 lg:pt-6">
          <OfferGridSkeleton count={3} />
        </div>
      </>
    );
  }

  const bySlug = new Map((offers ?? []).map((o) => [o.slug, o]));
  const list = saved.map((slug) => bySlug.get(slug)).filter((o): o is OfferSummary => Boolean(o));
  const active = list.filter((o) => !o.isExpired);
  const expired = list.filter((o) => o.isExpired);

  if (!list.length) {
    return (
      <EmptyState
        icon={Bookmark}
        title={t("No saved offers yet")}
        hint={t("Tap Save on an offer you like to see it here.")}
        action={<ButtonLink href="/offers">{t("Browse offers")}</ButtonLink>}
      />
    );
  }

  function onRemove(slug: string) {
    const index = saved.indexOf(slug);
    const change = remove(slug);
    void change?.done.then((ok) => ok || toast(t("Could not save. Please try again.")));
    toast(t("Offer removed"), { actionLabel: t("Undo"), onAction: () => void restore(slug, index) });
  }

  const soon = active.filter((o) => o.daysLeft <= ENDING_SOON_DAYS);
  const liveGrid = (offers: OfferSummary[], empty: string) => (
    <div className="pt-4 lg:pt-6">
      {offers.length ? (
        <Grid>
          {offers.map((offer) => (
            <OfferCard
              key={offer.slug}
              offer={offer}
              footer={
                offer.daysLeft <= ENDING_SOON_DAYS && (
                  <p className="flex items-center gap-1.5 text-body-sm font-medium text-warning">
                    <Clock size={14} aria-hidden />
                    {formatEndsIn(offer.daysLeft, locale)}
                  </p>
                )
              }
            />
          ))}
        </Grid>
      ) : (
        <p className="py-10 text-center text-body-sm text-muted">{empty}</p>
      )}
    </div>
  );

  return (
    <Tabs
      variant="chips"
      listClassName="no-scrollbar overflow-x-auto"
      items={[
        { value: "active", label: t("Live ({count})", { count: active.length }), content: liveGrid(active, t("No live offers saved.")) },
        ...(soon.length ? [{ value: "soon", label: t("Ending soon ({count})", { count: soon.length }), content: liveGrid(soon, t("No live offers saved.")) }] : []),
        {
          value: "expired",
          label: t("Expired ({count})", { count: expired.length }),
          content: (
            <div className="pt-4 lg:pt-6">
              {expired.length ? (
                <Grid>
                  {expired.map((offer) => (
                    <OfferCard
                      key={offer.slug}
                      offer={offer}
                      footer={
                        <Button variant="outline" size="sm" block onClick={() => onRemove(offer.slug)}>
                          {t("Remove")}
                        </Button>
                      }
                    />
                  ))}
                </Grid>
              ) : (
                <p className="py-10 text-center text-body-sm text-muted">{t("No expired offers saved.")}</p>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
