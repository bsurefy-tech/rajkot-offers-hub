"use client";

import { LocateFixed, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/client";
import { clearLocationAction, setGpsLocationAction, type LocationResult } from "@/lib/actions/location";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import type { Near } from "@/lib/location";

/**
 * The "near me" block at the top of the location sheet: the browser's GPS.
 */
export function NearMe({ near, onLocated, onCleared }: { near?: Near; onLocated: () => void; onCleared: () => void }) {
  const t = useT();
  const [error, setError] = useState<MessageKey | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = locating || pending;

  function finish(result: LocationResult) {
    if (result.ok) onLocated();
    else setError(result.error);
  }

  function locateByGps() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("We could not get your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        track("location_request", { source: "picker", result: "granted" });
        setLocating(false);
        startTransition(async () => finish(await setGpsLocationAction(position.coords.latitude, position.coords.longitude)));
      },
      (failure) => {
        track("location_request", { source: "picker", result: failure.code === failure.PERMISSION_DENIED ? "denied" : "error" });
        setLocating(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location access is off."
            : "We could not get your location.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    );
  }

  function clear() {
    setError(null);
    startTransition(async () => {
      await clearLocationAction();
      onCleared();
    });
  }

  return (
    <div className="flex flex-col gap-3 px-1 pb-2">
      {near && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-body">
          <LocateFixed size={16} className="shrink-0 text-primary" aria-hidden />
          <span className="flex-1">{t("Showing distances from your location")}</span>
          <button type="button" onClick={clear} disabled={busy} className="inline-flex cursor-pointer items-center gap-1 text-body-sm font-medium text-muted hover:text-ink">
            <X size={14} aria-hidden />
            {t("Clear")}
          </button>
        </div>
      )}
      <Button type="button" variant="outline" block onClick={locateByGps} disabled={busy}>
        <LocateFixed size={18} aria-hidden />
        {locating ? t("Finding you…") : t("Offers near me")}
      </Button>
      {error && (
        <p role="alert" className="text-body text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
