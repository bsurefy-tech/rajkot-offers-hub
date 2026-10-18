"use client";

import { Link } from "@/components/i18n/link";
import { useParams, usePathname } from "next/navigation";
import { Bookmark, CircleUserRound, Gift, House, Play, Tag } from "lucide-react";
import { usePoints } from "@/hooks/use-points";
import { stripArea } from "@/lib/areas";
import { splitLocale } from "@/lib/i18n/config";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import { mainNav } from "@/lib/site";

function isActive(pathname: string, href: string, area?: string) {
  const path = stripArea(splitLocale(pathname).path, area);
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

/** Desktop header navigation. */
export function HeaderNav() {
  const pathname = usePathname();
  const { area } = useParams<{ area?: string }>();
  const t = useT();
  return (
    <nav aria-label={t("Main menu")}>
      <ul className="flex items-center gap-5 text-title xl:gap-9 font-medium">
        {mainNav.map((item) => {
          const active = isActive(pathname, item.href, area);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("transition-colors", active ? "text-ink" : "text-muted hover:text-ink")}
              >
                {t(item.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type TabItem = { href: string; label: MessageKey; icon: typeof House; raised?: boolean };

const home: TabItem = { href: "/", label: "Home", icon: House };
const offers: TabItem = { href: "/offers", label: "Offers", icon: Tag };
/** The raised middle tab: the full-screen reels. */
const zalak: TabItem = { href: "/zalak", label: "Zalak", icon: Play, raised: true };
const profile: TabItem = { href: "/account", label: "Profile", icon: CircleUserRound };

const bottomNav: TabItem[] = [home, offers, zalak, { href: "/saved", label: "Saved", icon: Bookmark }, profile];

/** With the rewards programme on, Rewards takes Saved's place (Saved is on the account page). */
const bottomNavWithRewards: TabItem[] = [home, offers, zalak, { href: "/rewards", label: "Rewards", icon: Gift }, profile];

/** A dot on the Rewards tab while there is a scratch card to scratch. */
function ScratchDot() {
  const points = usePoints();
  if (points.status !== "ready" || points.cards === 0) return null;
  return <span aria-hidden className="absolute top-2 left-1/2 ml-1.5 size-2.5 rounded-full border-2 border-white bg-primary" />;
}

/** Mobile tab bar, fixed to the bottom of the screen. */
export function BottomNav({ rewards, zalak: withZalak = true }: { rewards?: boolean; zalak?: boolean }) {
  const pathname = usePathname();
  const { area } = useParams<{ area?: string }>();
  const t = useT();
  return (
    <nav
      aria-label={t("Main menu")}
      data-bottom-bar
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-16 auto-cols-fr grid-flow-col">
        {(rewards ? bottomNavWithRewards : bottomNav).filter((tab) => withZalak || tab !== zalak).map(({ href, label, icon: Icon, raised }) => {
          const active = isActive(pathname, href, area);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-micro",
                  active ? "font-semibold text-primary" : "font-medium text-muted",
                )}
              >
                {raised ? (
                  <>
                    {/* The label keeps its place on the shared baseline; the round button rises out of the bar above it. */}
                    <span aria-hidden className="size-[22px]" />
                    <span className="absolute -top-6 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_14px_rgb(225_22_84/0.35),0_0_0_5px_white]">
                      <Icon size={24} aria-hidden className="fill-white" />
                    </span>
                  </>
                ) : (
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                )}
                {t(label)}
                {href === "/rewards" && <ScratchDot />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
