"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { setGlobalProperties } from "@/lib/analytics/client";
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
export function Analytics({ clientId, lang, signedIn }: { clientId: string; lang: string; signedIn: boolean }) {
  const pageType = pageTypeOf(usePathname());
  const first = useRef(true);

  // The first page's properties go in with the script; later pages update them before the script reports the view.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setGlobalProperties({ page_type: pageType, signed_in: signedInHint() });
  }, [pageType]);

  // An installed app (home-screen icon) against a browser tab; waits for the script, which loads after the page.
  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    let tries = 0;
    const timer = setInterval(() => {
      if ("op" in window || ++tries > 25) {
        clearInterval(timer);
        setGlobalProperties({ standalone: true });
      }
    }, 200);
    return () => clearInterval(timer);
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
      globalProperties={{ lang, page_type: pageType, signed_in: signedIn, standalone: false }}
    />
  );
}
