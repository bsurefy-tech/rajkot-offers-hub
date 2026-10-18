"use client";

import { LocateFixed } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Link } from "@/components/i18n/link";
import { useT } from "@/lib/i18n/client";
import { PICK_LOCATION_EVENT, readNearCookie, subscribeNear } from "@/lib/location";
import { cn } from "@/lib/utils";

const linkClass = "inline-flex cursor-pointer items-center gap-1.5 text-body font-medium text-primary hover:underline";

/** "Offers near me": the nearest-first list, or the location sheet when no location is set yet. */
export function NearMeLink({ className }: { className?: string }) {
  const t = useT();
  const hasNear = Boolean(useSyncExternalStore(subscribeNear, readNearCookie, () => null));
  const content = (
    <>
      <LocateFixed size={16} aria-hidden />
      {t("Offers near me")}
    </>
  );
  return hasNear ? (
    <Link href="/offers?sort=nearest" className={cn(linkClass, className)}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(PICK_LOCATION_EVENT))} className={cn(linkClass, className)}>
      {content}
    </button>
  );
}
