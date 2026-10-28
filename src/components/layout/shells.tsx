import type { ReactNode } from "react";
import { Footer } from "./footer";
import { DesktopHeader, MobileHeader } from "./header";
import { ScrollShadow } from "./scroll-shadow";
import { SiteBottomNav } from "./bottom-nav";

/** Browsing pages: full header, footer and the mobile tab bar. */
export function MainShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollShadow />
      <DesktopHeader />
      <MobileHeader />
      <main className="flex-1 bg-surface">{children}</main>
      <Footer className="pb-16 lg:pb-0" />
      <SiteBottomNav />
    </>
  );
}

/**
 * Detail and task pages. On mobile each page draws its own top bar and
 * sticky action bar, so the shared header and footer show on desktop only.
 */
export function FocusShell({ children }: { children: ReactNode }) {
  return (
    <>
      <ScrollShadow />
      <DesktopHeader />
      <main className="flex-1 lg:bg-surface">{children}</main>
      <Footer className="hidden lg:block" />
    </>
  );
}
