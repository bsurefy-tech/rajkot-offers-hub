"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setGpsLocationAction } from "@/lib/actions/location";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { NEAR_CHANGED_EVENT } from "@/lib/location";

/** Asks the browser for the visitor's position once they tap, saves it as their "near me" location and reloads the page with it. */
export function NearYouPrompt() {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<MessageKey | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = locating || pending;

  function locate() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("We could not get your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        startTransition(async () => {
          const result = await setGpsLocationAction(position.coords.latitude, position.coords.longitude);
          if (!result.ok) return setError(result.error);
          window.dispatchEvent(new Event(NEAR_CHANGED_EVENT));
          router.refresh();
        });
      },
      (failure) => {
        setLocating(false);
        setError(failure.code === failure.PERMISSION_DENIED ? "Location access is off." : "We could not get your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary-soft via-white to-white p-5 lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex items-center gap-4 lg:gap-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-card ring-4 ring-primary/10 lg:size-16">
            <LocateFixed size={26} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-base leading-snug font-bold lg:text-xl">{t("Find offers around you")}</p>
            <p className="mt-1 text-sm leading-snug text-muted lg:text-[15px]">{t("See the offers closest to you, nearest first.")}</p>
          </div>
        </div>
        <Button onClick={locate} disabled={busy} size="lg" className="w-full lg:w-auto">
          <LocateFixed size={18} aria-hidden />
          {locating ? t("Finding you…") : t("Offers near me")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
