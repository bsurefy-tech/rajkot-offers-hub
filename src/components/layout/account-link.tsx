"use client";

import { CircleUserRound } from "lucide-react";
import { IconLink } from "@/components/ui/icon-button";
import { useUnread } from "@/hooks/use-unread";
import { useT } from "@/lib/i18n/client";

/** Desktop header account button: saved, rewards and notifications all live on the account page, so the unread count rides on it. */
export function AccountLink() {
  const t = useT();
  const unread = useUnread();
  return (
    <IconLink href="/account" variant="plain" size="xl" count={Math.min(unread, 9)} aria-label={unread ? t("My account ({count} new)", { count: unread }) : t("My account")}>
      <CircleUserRound size={34} strokeWidth={1.5} aria-hidden />
    </IconLink>
  );
}
