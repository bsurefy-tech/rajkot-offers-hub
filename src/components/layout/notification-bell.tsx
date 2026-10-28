"use client";

import { Bell } from "lucide-react";
import { IconLink } from "@/components/ui/icon-button";
import { useUnread } from "@/hooks/use-unread";
import { useT } from "@/lib/i18n/client";

/** Header bell: opens the notifications, with the number not read yet. */
export function NotificationBell() {
  const t = useT();
  const unread = useUnread();
  return (
    <IconLink href="/notifications" variant="plain" size="lg" count={Math.min(unread, 9)} aria-label={unread ? t("Notifications ({count} new)", { count: unread }) : t("Notifications")}>
      <Bell size={20} aria-hidden />
    </IconLink>
  );
}
