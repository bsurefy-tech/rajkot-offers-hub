"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";
import { usePathname } from "next/navigation";
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
