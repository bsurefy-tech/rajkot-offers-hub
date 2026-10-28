"use server";

import { cookies } from "next/headers";
import type { MessageKey } from "@/lib/i18n/translate";
import { isInRajkot, NEAR_COOKIE, NEAR_COOKIE_MAX_AGE, serializeNear, type Near } from "@/lib/location";

/**
 * "Near me": the visitor's GPS position, saved in a cookie that lists then sort and measure by.
 */

export type LocationResult = { ok: true } | { ok: false; error: MessageKey };

async function save(near: Near) {
  (await cookies()).set(NEAR_COOKIE, serializeNear(near), {
    // Client code reads it too, for the header pill; it holds nothing but a rounded point.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: NEAR_COOKIE_MAX_AGE,
  });
}

export async function setGpsLocationAction(lat: number, lng: number): Promise<LocationResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: "We could not get your location." };
  if (!isInRajkot({ lat, lng })) return { ok: false, error: "You seem to be outside Rajkot." };
  await save({ lat, lng });
  return { ok: true };
}

export async function clearLocationAction() {
  (await cookies()).delete(NEAR_COOKIE);
}
