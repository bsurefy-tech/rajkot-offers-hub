"use client";

import { Bell, Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { ShopAvatar } from "@/components/businesses/avatar";
import { Link } from "@/components/i18n/link";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { useSaved } from "@/hooks/use-saved";
import { savedShopCards, type SavedShop } from "@/lib/actions/saves";
import { useT } from "@/lib/i18n/client";
import { shopPath } from "@/lib/paths";

/** Saved shops, or the shops followed (`kind="follow"`), newest first. Cards are fetched for the shops on the account. */
export function SavedShops({ kind = "shop" }: { kind?: "shop" | "follow" }) {
  const t = useT();
  const toast = useToast();
  const following = kind === "follow";
  const { saved, ready, remove, restore } = useSaved(kind);
  const [shops, setShops] = useState<SavedShop[] | null>(null);
  const key = saved.join("|");

  useEffect(() => {
    let current = true;
    savedShopCards(key ? key.split("|") : []).then((cards) => current && setShops(cards), () => current && setShops([]));
    return () => {
      current = false;
    };
  }, [key]);

  if (!ready || (saved.length > 0 && shops === null)) {
    return (
      <div aria-hidden className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const bySlug = new Map((shops ?? []).map((shop) => [shop.slug, shop]));
  const list = saved.map((slug) => bySlug.get(slug)).filter((shop): shop is SavedShop => Boolean(shop));

  if (!list.length) {
    return (
      <EmptyState
        icon={following ? Bell : Bookmark}
        title={following ? t("You are not following any shop yet") : t("No saved shops yet")}
        hint={following ? t("Follow a shop to see its new offers first and get told about them.") : t("Tap Save on a shop you like to see it here.")}
        action={<ButtonLink href="/offers">{t("Browse offers")}</ButtonLink>}
      />
    );
  }

  function onRemove(slug: string) {
    const index = saved.indexOf(slug);
    const change = remove(slug);
    void change?.done.then((ok) => ok || toast(t("Could not save. Please try again.")));
    toast(following ? t("Unfollowed") : t("Shop removed"), { actionLabel: t("Undo"), onAction: () => void restore(slug, index) });
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {list.map((shop) => (
        <li key={shop.slug} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
          <Link href={shopPath(shop.slug)} className="flex min-w-0 flex-1 items-center gap-3">
            <ShopAvatar logo={shop.logo} className="size-14 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-body font-semibold">{shop.name}</span>
              <span className="block truncate text-body-sm text-muted">{t("{category} • {area}, Rajkot", { category: shop.categoryName, area: shop.areaName })}</span>
            </span>
          </Link>
          <IconButton variant="soft" size="lg" aria-label={following ? t("Unfollow") : t("Remove from saved")} onClick={() => onRemove(shop.slug)}>
            {following ? <Bell size={20} aria-hidden className="fill-primary text-primary" /> : <Bookmark size={20} aria-hidden className="fill-primary text-primary" />}
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
