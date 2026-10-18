import type { MessageKey } from "@/lib/i18n/translate";

export const site = {
  name: "Rajkot Offers Hub",
  city: "Rajkot",
  tagline: "Local offers in Rajkot, all in one place.",
  /** The canonical address. */
  url: "https://rajkotoffershub.com",
  instagram: "@rajkotoffershub",
  email: "hello@rajkotoffershub.com",
  /** The one number for calls and WhatsApp (contact page, submit an offer, report an offer). */
  phone: "+91 94294 74941",
  whatsapp: "+91 94294 74941",
  location: "Rajkot, Gujarat",
  /** For structured data: the city the site serves. */
  region: "Gujarat",
  /** Centre of Rajkot, for the geo meta tags. */
  geo: { lat: 22.3039, lng: 70.8022 },
  country: "IN",
  /** Shop owners list and manage offers in the business app. Store links come from the environment. */
  ownerApp: {
    android: process.env.NEXT_PUBLIC_OWNER_APP_ANDROID_URL || null,
    ios: process.env.NEXT_PUBLIC_OWNER_APP_IOS_URL || null,
  },
} as const;

/** "/offers" → "https://rajkotoffershub.com/offers". */
export function absoluteUrl(path: string) {
  return new URL(path, site.url).toString();
}

export const mainNav = [
  { href: "/", label: "Home" },
  { href: "/offers", label: "Offers" },
  { href: "/categories", label: "Categories" },
  { href: "/how-it-works", label: "How it works" },
] as const satisfies readonly { href: string; label: MessageKey }[];

export const footerNav = [...mainNav, { href: "/contact", label: "Contact" }] as const satisfies readonly {
  href: string;
  label: MessageKey;
}[];

export const legalNav = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of use" },
] as const satisfies readonly { href: string; label: MessageKey }[];
