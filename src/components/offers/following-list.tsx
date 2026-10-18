"use client";

import { Bell, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { ShopAvatar } from "@/components/businesses/avatar";
import { Link } from "@/components/i18n/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { useFollowedShops } from "@/hooks/use-saved";
import { followedShopsAction, type FollowedShop } from "@/lib/actions/followed-offers";
import { ENDING_SOON_DAYS, formatEndsIn } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { offerPath, shopPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/**
 * The Following tab: a row of the shops you follow (a pink ring on those with a live offer), then each shop with
 * its newest live offer and a bell to stop following.
 */
export function FollowingList() {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const { saved, ready, remove, restore } = useFollowedShops();
  const [shops, setShops] = useState<FollowedShop[] | null>(null);
  const key = saved.join("|");

  useEffect(() => {
    let current = true;
    followedShopsAction(key ? key.split("|") : []).then((list) => current && setShops(list), () => current && setShops([]));
    return () => {
      current = false;
    };
  }, [key]);

  if (!ready || (saved.length > 0 && shops === null)) {
    return (
      <div aria-hidden className="flex flex-col gap-5">
        <div className="flex gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-2">
              <Skeleton className="size-16 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[132px] rounded-2xl" />
        ))}
      </div>
    );
  }

  const bySlug = new Map((shops ?? []).map((shop) => [shop.slug, shop]));
  const list = saved.map((slug) => bySlug.get(slug)).filter((shop): shop is FollowedShop => Boolean(shop));

  if (!list.length) {
    return (
      <EmptyState
        icon={Bell}
        title={t("You are not following any shop yet")}
        hint={t("Follow a shop to see its new offers first and get told about them.")}
        action={<ButtonLink href="/offers">{t("Browse offers")}</ButtonLink>}
      />
    );
  }

  const withOffers = list.filter((shop) => shop.offers.length > 0);
  const liveTotal = withOffers.reduce((sum, shop) => sum + shop.offers.length, 0);

  function onUnfollow(slug: string) {
    const index = saved.indexOf(slug);
    const change = remove(slug);
    void change?.done.then((ok) => ok || toast(t("Could not save. Please try again.")));
    toast(t("Unfollowed"), { actionLabel: t("Undo"), onAction: () => void restore(slug, index) });
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={t("Shops you follow")}>
        <p className="mb-3 text-body-sm text-muted">
          {liveTotal > 0 ? t("{offers} live from {shops} of your shops", { offers: liveTotal, shops: withOffers.length }) : t("None of your shops has a live offer right now.")}
        </p>
        <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {[...withOffers, ...list.filter((shop) => shop.offers.length === 0)].map((shop) => (
            <li key={shop.slug} className="w-[68px] shrink-0">
              <Link href={shopPath(shop.slug)} className="flex flex-col items-center gap-1.5">
                <span className={cn("rounded-full border-2 p-0.5", shop.offers.length ? "border-primary" : "border-line")}>
                  <ShopAvatar logo={shop.logo} className="size-[52px] border-0" />
                </span>
                <span className="w-full truncate text-center text-caption font-medium">{shop.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        {list.map((shop) => {
          const latest = shop.offers[0];
          return (
            <li key={shop.slug} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center gap-3">
                <Link href={shopPath(shop.slug)} className="flex min-w-0 flex-1 items-center gap-3">
                  <ShopAvatar logo={shop.logo} className="size-14 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold">{shop.name}</span>
                    <span className="block truncate text-body-sm text-muted">{t("{category} • {area}, Rajkot", { category: shop.categoryName, area: shop.areaName })}</span>
                  </span>
                </Link>
                <IconButton variant="soft" size="lg" aria-label={t("Unfollow")} onClick={() => onUnfollow(shop.slug)}>
                  <Bell size={20} aria-hidden className="fill-primary text-primary" />
                </IconButton>
              </div>
              {latest ? (
                <Link href={offerPath(latest)} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-3 transition-colors hover:bg-canvas">
                  <span className="min-w-0">
                    <span className="block truncate text-body font-semibold">{latest.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-body-sm text-muted">
                      {latest.daysLeft <= ENDING_SOON_DAYS && <Clock size={13} aria-hidden className="text-warning" />}
                      <span className={cn(latest.daysLeft <= ENDING_SOON_DAYS && "font-medium text-warning")}>{formatEndsIn(latest.daysLeft, locale)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-caption font-semibold text-white">
                    {shop.offers.length > 1 ? t("{count} live", { count: shop.offers.length }) : latest.badge}
                  </span>
                </Link>
              ) : (
                <p className="rounded-xl bg-surface px-3.5 py-3 text-body-sm text-muted">{t("No live offers right now. We'll tell you when there is one.")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
