import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Teaches tailwind-merge our type scale (globals.css), so text-body isn't mistaken for a colour and a text-white next to it dropped. */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["micro", "caption", "body-sm", "body", "title", "heading", "page", "display", "field"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Digits only, for tel: and wa.me links. */
export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function telHref(phone: string) {
  return `tel:+${digits(phone)}`;
}

export function whatsappHref(phone: string, text?: string) {
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits(phone)}${query}`;
}

export function directionsHref(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function instagramHref(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

/** Copy of `record` without `key`. */
export function omit<T extends Record<string, unknown>>(record: T, key: string): T {
  const copy = { ...record };
  delete copy[key];
  return copy;
}
