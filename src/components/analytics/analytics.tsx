"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useLayoutEffect, useRef } from "react";
import { clearIdentity, noteIdentified, setGlobalProperties, track } from "@/lib/analytics/client";
import { pageTypeOf } from "@/lib/analytics/page-type";
import { signedInHint } from "@/lib/auth/hint";

/**
 * Runs in the browser before anything is sent: leaves out visitors who ask not to be tracked (Do Not Track, Global
 * Privacy Control) and crawlers, and drops the second page view the script sends for the same address within a
 * moment (Next.js rewrites the history entry right after the first load, which the script takes for a navigation).
 * Passed as text, so it cannot use anything outside itself.
 */
const FILTER = `function(e){
  var n=navigator;
  if(n.doNotTrack==='1'||n.globalPrivacyControl===true||/bot|crawl|spider|headless|lighthouse/i.test(n.userAgent))return false;
  var p=e&&e.payload;
  if(e&&e.type==='track'&&p&&p.name==='screen_view'){
    var k=p.properties&&p.properties.__path,t=Date.now(),l=window.__opLastView;
    if(l&&l.k===k&&t-l.t<2000)return false;
    window.__opLastView={k:k,t:t};
  }
  return true;
}`;

/** Share of visits that report web vitals (LCP, INP, CLS, TTFB): enough for a trend without an event per metric per visit. */
const VITALS_SAMPLE = 0.2;
const MAX_ERRORS_PER_VISIT = 5;

/** Whether this visit reports web vitals; decided once per page load. */
const sampled = typeof window !== "undefined" && Math.random() < VITALS_SAMPLE;

/** A page's vitals, when this visit was picked. */
function reportVital(metric: { name: string; value: number; rating?: string }) {
  if (!sampled) return;
  // CLS is a small ratio; the rest are milliseconds.
  track("web_vitals", { metric: metric.name, value: metric.name === "CLS" ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value), rating: metric.rating ?? "" });
}

/**
 * Loads OpenPanel through this site's own `/api/op` proxy and keeps the properties every event carries
 * (`page_type`, `signed_in`, `lang`) current. Page views and outgoing link clicks are tracked by the script itself.
 */
export function Analytics({ clientId, lang, signedIn, profileId }: { clientId: string; lang: string; signedIn: boolean; profileId?: string }) {
  const pathname = usePathname();
  const pageType = pageTypeOf(pathname);
  const first = useRef(true);

  // The first page's properties go in with the script; later pages update them before the script reports the view.
  // The previous page's shop, category and area are dropped; the page's own `PageMarker` sets its own after this.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Signed out since the last page (logout, expired, deleted): stop attributing events to the account.
    if (!signedInHint() && clearIdentity()) track("signed_out", {});
    setGlobalProperties({ page_type: pageType, signed_in: signedInHint(), shop: undefined, category: undefined, area: undefined });
    // `pageType` follows `pathname`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (profileId) noteIdentified();
  }, [profileId]);

  useReportWebVitals(reportVital);

  // Script errors and failed promises, a few per visit, short and without the stack (which can hold addresses with personal data).
  useEffect(() => {
    let sent = 0;
    const report = (source: "error" | "promise", reason: unknown) => {
      if (sent >= MAX_ERRORS_PER_VISIT) return;
      sent++;
      const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "unknown";
      track("app_error", { source, message: message.slice(0, 120) });
    };
    const onError = (event: ErrorEvent) => report("error", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => report("promise", event.reason);
    const onInstalled = () => track("pwa_installed", {});
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // An installed app (home-screen icon) against a browser tab.
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setGlobalProperties({ standalone: true });
  }, []);

  return (
    <OpenPanelComponent
      clientId={clientId}
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
      filter={FILTER}
      profileId={profileId}
      globalProperties={{ lang, page_type: pageType, signed_in: signedIn, standalone: false }}
    />
  );
}
