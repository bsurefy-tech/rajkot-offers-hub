"use client";

import { Bookmark } from "lucide-react";
import { useLogin } from "@/components/auth/login-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { Tabs } from "@/components/ui/tabs";
import { loadSaves, useFollowedShops, useSavedOffers, useSavedShops } from "@/hooks/use-saved";
import { useT } from "@/lib/i18n/client";
import { SavedOffers } from "./saved-offers";
import { FollowingList } from "./following-list";
import { SavedShops } from "./saved-shops";

/** The saved page: offers, shops and followed shops in three tabs. They live on the account, so a guest is asked to log in. */
export function SavedItems({ initialTab }: { initialTab?: "offers" | "shops" | "following" }) {
  const t = useT();
  const login = useLogin();
  const offers = useSavedOffers();
  const shops = useSavedShops();
  const follows = useFollowedShops();

  if (offers.ready && !offers.member) {
    return (
      <EmptyState
        icon={Bookmark}
        title={t("Log in to see what you saved")}
        hint={t("Your saved offers and shops are kept on your account.")}
        action={<Button onClick={() => login.prompt("saved", () => void loadSaves())}>{t("Log in")}</Button>}
      />
    );
  }

  return (
    <Tabs
      variant="segmented"
      defaultValue={initialTab}
      panelClassName="pt-5 lg:pt-6"
      items={[
        { value: "offers", label: t("Offers ({count})", { count: offers.saved.length }), content: <SavedOffers /> },
        { value: "shops", label: t("Shops ({count})", { count: shops.saved.length }), content: <SavedShops /> },
        { value: "following", label: t("Following ({count})", { count: follows.saved.length }), content: <FollowingList /> },
      ]}
    />
  );
}
