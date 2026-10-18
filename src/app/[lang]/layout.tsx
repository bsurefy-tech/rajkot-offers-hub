import type { Metadata, Viewport } from "next";
import { Anek_Gujarati, IBM_Plex_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Analytics } from "@/components/analytics/analytics";
import { LoginProvider } from "@/components/auth/login-dialog";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { ToastProvider } from "@/components/ui/toast";
import { analyticsConfig } from "@/lib/analytics/config";
import { ANALYTICS_USER_COOKIE, SIGNED_IN_HINT_COOKIE } from "@/lib/auth/cookies";
import { hasLocale } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import { DEFAULT_SHARE_IMAGE } from "@/lib/seo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import "../globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"] });

const anek = Anek_Gujarati({
  variable: "--font-anek",
  subsets: ["gujarati", "latin"],
  weight: ["400", "500", "600", "700"],
  // Only Gujarati pages use it, so it loads on demand instead of being preloaded everywhere.
  preload: false,
});

/**
 * Every page is rendered per request. Prerendered pages (and the Cache Components that build them)
 * are refreshed at request time, and that hangs on Cloudflare Workers once an entry expires.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} — ${t("Offers in Rajkot")}`, template: `%s · ${site.name}` },
    description: t("Fresh offers from Rajkot's shops, cafés and salons, all in one place."),
    applicationName: site.name,
    openGraph: {
      siteName: site.name,
      locale: locale === "gu" ? "gu_IN" : "en_IN",
      type: "website",
      images: [DEFAULT_SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", images: [DEFAULT_SHARE_IMAGE] },
    // Allow large image previews and full snippets (Search, Discover) on every indexable page.
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
    },
    // Tells location-aware engines (Bing in particular) which city the site is about.
    other: {
      "geo.region": "IN-GJ",
      "geo.placename": site.city,
      "geo.position": `${site.geo.lat};${site.geo.lng}`,
      ICBM: `${site.geo.lat}, ${site.geo.lng}`,
    },
    // Search Console / Bing Webmaster ownership checks; set the tokens in the deployment's environment.
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const analytics = analyticsConfig();
  const jar = analytics ? await cookies() : undefined;
  const signedIn = Boolean(jar?.has(SIGNED_IN_HINT_COOKIE));
  const profileId = signedIn ? jar?.get(ANALYTICS_USER_COOKIE)?.value : undefined;

  return (
    <html lang={lang === "gu" ? "gu-IN" : "en-IN"} className={cn(plex.variable, lang === "gu" && anek.variable)}>
      <body className="flex min-h-dvh flex-col">
        {analytics && <Analytics clientId={analytics.clientId} lang={lang} signedIn={signedIn} profileId={profileId} />}
        <LocaleProvider locale={lang}>
          <ToastProvider>
            <LoginProvider>{children}</LoginProvider>
            <ScrollToTop />
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
