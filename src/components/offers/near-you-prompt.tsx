"use client";

import { LocateFixed, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  const [blocked, setBlocked] = useState(false);
  const busy = locating || pending;

  // Where the browser can tell us, learn up front that location is blocked, and follow it if the visitor turns it back on.
  useEffect(() => {
    let status: PermissionStatus | undefined;
    const sync = () => status && setBlocked(status.state === "denied");
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((result) => {
        status = result;
        sync();
        result.addEventListener("change", sync);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", sync);
  }, []);

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
        if (failure.code === failure.PERMISSION_DENIED) setBlocked(true);
        else setError("We could not get your location.");
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
          {locating ? t("Finding you…") : t("Enable location to see nearest offers")}
        </Button>
      </div>
      {blocked && (
        <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/80 p-3.5 text-sm leading-snug text-ink ring-1 ring-line">
          <TriangleAlert size={18} className="mt-px shrink-0 text-primary" aria-hidden />
          <p>
            <span className="font-semibold">{t("Location is turned off for this site.")}</span>{" "}
            <span className="text-muted">{t("To see offers near you, allow location from the lock icon next to the address bar, then tap the button again.")}</span>
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
