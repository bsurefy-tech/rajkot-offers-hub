"use client";

import { Bell, Gift } from "lucide-react";
import { useEffect, useState } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { Link } from "@/components/i18n/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/display";
import { setUnread } from "@/hooks/use-unread";
import { loadNotificationsAction, markReadAction, type NotificationsResult, type SiteNotification } from "@/lib/actions/notifications";
import { useLocale, useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const NEW_OFFER = /^New offer from (.+)$/;

/** "5 minutes ago", "yesterday": in the visitor's language. */
function timeAgo(iso: string, locale: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, "second");
}

/** The visitor's notifications, newest first; opening one marks it read. */
export function NotificationList() {
  const t = useT();
  const locale = useLocale();
  const login = useLogin();
  const [result, setResult] = useState<NotificationsResult | null>(null);

  function load() {
    void loadNotificationsAction().then((next) => {
      setResult(next);
      if (next.status === "member") setUnread(next.unread);
    });
  }

  useEffect(load, []);

  if (!result) {
    return (
      <div aria-hidden className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (result.status === "guest") {
    return (
      <EmptyState
        icon={Bell}
        title={t("Log in to see your notifications")}
        hint={t("Follow shops to hear about their new offers.")}
        action={<Button onClick={() => login.prompt(load)}>{t("Log in")}</Button>}
      />
    );
  }

  if (result.status === "error") {
    return <EmptyState icon={Bell} title={t("Could not load notifications")} hint={t("Please try again in a moment.")} action={<Button onClick={load}>{t("Try again")}</Button>} />;
  }

  const { items, unread } = result;

  if (!items.length) {
    return (
      <EmptyState
        icon={Bell}
        title={t("No notifications yet")}
        hint={t("Follow a shop and we'll tell you when it has a new offer.")}
        action={<ButtonLink href="/offers">{t("Browse offers")}</ButtonLink>}
      />
    );
  }

  function read(id?: string) {
    setResult((current) => {
      if (current?.status !== "member") return current;
      const items = current.items.map((n) => (id === undefined || n.id === id ? { ...n, read: true } : n));
      const unread = items.filter((n) => !n.read).length;
      setUnread(unread);
      return { ...current, items, unread };
    });
    void markReadAction(id);
  }

  function title(n: SiteNotification) {
    const shop = n.type === "promotion.live" ? NEW_OFFER.exec(n.title)?.[1] : undefined;
    return shop ? t("New offer from {shop}", { shop }) : n.title;
  }

  return (
    <div className="flex flex-col gap-4">
      {unread > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => read()}>
            {t("Mark all as read")}
          </Button>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {items.map((n) => {
          const content = (
            <>
              <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", n.type?.startsWith("loyalty.") ? "bg-primary-soft text-primary" : "bg-surface text-muted")}>
                {n.type?.startsWith("loyalty.") ? <Gift size={18} /> : <Bell size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-body", n.read ? "font-medium" : "font-semibold")}>{title(n)}</span>
                {n.body && <span className="mt-0.5 block text-body-sm text-muted">{n.body}</span>}
                <span className="mt-1 block text-caption text-faint">{timeAgo(n.createdAt, locale)}</span>
              </span>
            </>
          );
          const style = "flex items-start gap-3 rounded-2xl border border-line bg-white p-4";
          return (
            <li key={n.id}>
              {n.href ? (
                <Link href={n.href} onClick={() => !n.read && read(n.id)} className={cn(style, "transition-colors hover:bg-surface")}>
                  {content}
                </Link>
              ) : (
                <div className={style}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
