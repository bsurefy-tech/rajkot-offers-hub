/**
 * The visitor's "near me" location, kept in a cookie rather than the URL so a shared
 * link never carries where someone is. Readable by client code too: the header pill
 * shows whether one is set. Coordinates are rounded to 3 decimals (about 110 m), the
 * same rounding the API's response cache uses.
 */
export const NEAR_COOKIE = "ro_near";
export const NEAR_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** Window event the location sheet listens for, so any button can open it. */
export const PICK_LOCATION_EVENT = "ro:pick-location";
/** Window event fired after the location changes, so readers of the cookie re-read it. */
export const NEAR_CHANGED_EVENT = "ro:near-changed";

export interface Near {
  lat: number;
  lng: number;
}

export const RAJKOT_CENTRE = { lat: 22.3039, lng: 70.8022 };
/** GPS further than this from the city centre is treated as "not in Rajkot". */
const RAJKOT_RADIUS_KM = 50;

const round = (value: number) => Math.round(value * 1000) / 1000;

export function serializeNear(near: Near) {
  return `${round(near.lat)},${round(near.lng)}`;
}

export function parseNear(value: string | undefined | null): Near | undefined {
  if (!value) return undefined;
  const [lat, lng] = decodeURIComponent(value).split(",");
  const near = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(near.lat) || !Number.isFinite(near.lng) || Math.abs(near.lat) > 90 || Math.abs(near.lng) > 180) return undefined;
  return near;
}

/** Straight-line kilometres between two points. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInRajkot(point: { lat: number; lng: number }) {
  return kmBetween(point, RAJKOT_CENTRE) <= RAJKOT_RADIUS_KM;
}

/** The cookie as client code sees it. */
export function readNearCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${NEAR_COOKIE}=([^;]*)`));
  return match ? match[1] : null;
}

/** For `useSyncExternalStore`: re-read the cookie whenever the location changes. */
export function subscribeNear(onChange: () => void) {
  window.addEventListener(NEAR_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(NEAR_CHANGED_EVENT, onChange);
}
