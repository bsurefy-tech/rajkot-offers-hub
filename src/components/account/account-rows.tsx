"use client";

import { Bell, BellRing, Bookmark, Gift, Heart, KeyRound, Ticket, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ChangeMpinForm, DeleteAccountForm, NameForm } from "@/components/auth/account-forms";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { loadFollowingPushAction, setFollowingPushAction } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import { useFollowedShops, useSavedOffers } from "@/hooks/use-saved";
import { useUnread } from "@/hooks/use-unread";
import { useT } from "@/lib/i18n/client";
import { RowBadge, SettingsButton, SettingsGroup, SettingsLink } from "./settings-row";

function initials(name: string | null | undefined, fallback: string) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

/** The profile card: initials, name and number; a tap opens the name form. */
export function ProfileCard({ name, mobile, email }: { name: string | null; mobile: string | null; email: string | null }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:bg-surface"
      >
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-heading font-semibold text-primary">
          {initials(name, "R")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-heading leading-snug font-semibold">{name || t("Add your name")}</span>
          {mobile && (
            <span className="block text-body-sm text-muted">
              <span className="sr-only">{t("Mobile")}: </span>
              {mobile}
            </span>
          )}
          {email && <span className="block truncate text-body-sm text-muted">{email}</span>}
        </span>
        <span className="text-body font-semibold text-primary">{t("Edit")}</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Your details")}>
        <NameForm name={name ?? undefined} />
      </Sheet>
    </>
  );
}

/** Saved offers, followed shops, codes and (with rewards on) reward codes. */
export function ActivityGroup({ rewards }: { rewards: boolean }) {
  const t = useT();
  const offers = useSavedOffers();
  const follows = useFollowedShops();
  const count = (n: number, ready: boolean) => (ready ? n : "…");
  return (
    <SettingsGroup title={t("Your activity")}>
      <SettingsLink href="/saved" icon={Bookmark} title={t("Saved offers and shops")} hint={t("{count} offers saved", { count: count(offers.saved.length, offers.ready) })} />
      <SettingsLink href="/saved?tab=following" icon={Heart} title={t("Shops you follow")} hint={t("{count} shops followed", { count: count(follows.saved.length, follows.ready) })} />
      <SettingsLink href="/account/codes" icon={Ticket} title={t("My offer codes")} hint={t("Codes you claimed on offers")} />
      {rewards && <SettingsLink href="/rewards" icon={Gift} title={t("Points and reward codes")} hint={t("Scratch cards, rewards and history")} />}
    </SettingsGroup>
  );
}

export function NotificationsGroup() {
  const t = useT();
  const unread = useUnread();
  return (
    <SettingsGroup title={t("Preferences")}>
      <SettingsLink
        href="/notifications"
        icon={Bell}
        title={t("Notifications")}
        hint={unread > 0 ? t("{count} new", { count: unread }) : t("New offers from shops you follow")}
        badge={unread > 0 ? <RowBadge>{unread}</RowBadge> : undefined}
      />
      <FollowingPushRow />
    </SettingsGroup>
  );
}

/** Phone alerts for what the shops you follow post. Off only silences the alert: the notification still lands in the list. */
function FollowingPushRow() {
  const t = useT();
  const toast = useToast();
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void loadFollowingPushAction().then((value) => alive && setOn(value));
    return () => {
      alive = false;
    };
  }, []);
  // Hidden until the account's choice is known (and for anyone it cannot be read for).
  if (on === null) return null;

  async function toggle() {
    const want = !on;
    setOn(want);
    if (!(await setFollowingPushAction(want))) {
      setOn(!want);
      toast(t("Could not save. Please try again."));
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => void toggle()}
      className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <BellRing size={20} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body leading-snug font-semibold">{t("Alerts from shops you follow")}</span>
        <span className="mt-0.5 block text-body-sm leading-snug text-muted">{t("New offers, statuses and reels, as phone alerts")}</span>
      </span>
      <span aria-hidden className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors", on ? "bg-primary" : "bg-line-strong")}>
        <span className={cn("size-5 rounded-full bg-white shadow transition-transform", on && "translate-x-5")} />
      </span>
    </button>
  );
}

/** Change MPIN and delete account open in sheets, so the page stays a plain list. */
export function SecurityGroup() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsGroup title={t("Security")}>
        <SettingsButton icon={KeyRound} title={t("Change my MPIN")} hint={t("The 6 digits you sign in with")} onClick={() => setOpen(true)} />
      </SettingsGroup>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Change MPIN")}>
        <ChangeMpinForm />
      </Sheet>
    </>
  );
}

export function DeleteRow() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsButton icon={Trash2} tone="danger" arrow={false} title={t("Delete my account")} hint={t("Your saved offers and points go with it")} onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Delete my account")}>
        <DeleteAccountForm startConfirming onCancel={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
