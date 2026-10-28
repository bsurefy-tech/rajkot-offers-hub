import { NextResponse, type NextRequest } from "next/server";
import { canonicalAreaUrl } from "@/lib/areas";
import { defaultLocale, LOCALE_COOKIE, languageSwitchEnabled, localizePath, splitLocale } from "@/lib/i18n/config";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth/cookies";
import { renewSession } from "@/lib/auth/proxy-session";
import { DEVICE_COOKIE, deviceCookieOptions } from "@/lib/api/device";
import { hasUnknownSlug, shopRoute } from "@/lib/known-paths";

/** Pages that read the signed-in user; the session is renewed before they render. */
const SESSION_PAGES = new Set(["/login", "/account", "/account/codes", "/rewards"]);

/**
 * Locale routing. English pages live at "/en/..." internally but are
 * served without a prefix; Gujarati pages are served at "/gu/...".
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale, path } = splitLocale(pathname);

  // "/en/offers" is not a public URL: send it to "/offers". With the switcher off, so is "/gu/offers".
  if (locale === defaultLocale || (locale && !languageSwitchEnabled)) {
    return NextResponse.redirect(new URL(`${path}${search}`, request.url), 308);
  }

  // Old-style "/offers?area=x&category=y" links become "/x/offers/y".
  const canonical = canonicalAreaUrl(path, request.nextUrl.searchParams);
  if (canonical) {
    return NextResponse.redirect(new URL(localizePath(locale ?? defaultLocale, canonical), request.url), 308);
  }

  // Shops and offers live at "/<shop>" and "/<shop>/<offer>"; their older addresses are sent there.
  const shop = await shopRoute(path);
  if (shop?.kind === "redirect") {
    return NextResponse.redirect(new URL(`${localizePath(locale ?? defaultLocale, shop.path)}${search}`, request.url), 308);
  }
  // The API is down, so a shop's offer cannot be told from a missing one: not a 404, which would be cached as a fact.
  if (shop?.kind === "unavailable") {
    return new NextResponse("Service temporarily unavailable", { status: 503, headers: { "Retry-After": "30" } });
  }
  const served = shop?.kind === "rewrite" ? shop.path : path;

  // Unknown slugs go to the catch-all 404 page now, while a 404 status can still be sent.
  // Four segments are deeper than any real route, so only the catch-all matches.
  if (!shop && (await hasUnknownSlug(path))) {
    return NextResponse.rewrite(new URL(`/${locale ?? defaultLocale}/_/not/found/page`, request.url));
  }

  const session = SESSION_PAGES.has(path) ? await renewSession(request) : null;
  // A visitor with no account is remembered by a random key, so the API can tell which statuses and reels they have seen.
  const needsDeviceKey = !request.cookies.has(DEVICE_COOKIE);
  const withSession = (response: NextResponse) => {
    if (session === "signed-out") clearSessionCookies(response.cookies);
    else if (session) setSessionCookies(response.cookies, session);
    if (needsDeviceKey) response.cookies.set(DEVICE_COOKIE, crypto.randomUUID(), deviceCookieOptions());
    return response;
  };
  const forward = { request: { headers: request.headers } };

  if (locale) {
    return withSession(shop ? NextResponse.rewrite(new URL(`/${locale}${served}${search}`, request.url), forward) : NextResponse.next(forward));
  }

  // No prefix: honour a saved Gujarati choice, otherwise serve English.
  if (languageSwitchEnabled && request.cookies.get(LOCALE_COOKIE)?.value === "gu") {
    return NextResponse.redirect(new URL(`${localizePath("gu", pathname)}${search}`, request.url));
  }
  return withSession(NextResponse.rewrite(new URL(`/${defaultLocale}${served === "/" ? "" : served}${search}`, request.url), forward));
}

export const config = {
  // Skip Next.js internals, API routes and files with an extension (icons, images).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
