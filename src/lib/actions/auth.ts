"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { ApiUser, BusinessResource, TokenPair } from "@/lib/api/types";
import { clearSessionCookies, setSessionCookies } from "@/lib/auth/cookies";
import { visitorIp } from "@/lib/api/visitor";
import { accessToken, safeNext, withSession } from "@/lib/auth/session";
import type { MessageKey } from "@/lib/i18n/translate";

/**
 * Login and account screens, against the BSurefy API. One login for everyone:
 * mobile number → WhatsApp code the first time (then set a 6-digit MPIN), or
 * the MPIN on every later visit. Errors come back as message keys so the
 * client shows them in the visitor's language.
 */

export type AuthResult<T = undefined> = { ok: true; data: T } | { ok: false; error: MessageKey; vars?: Record<string, string | number> };

type Failure = Extract<AuthResult, { ok: false }>;

function failure(error: unknown): Failure {
  if (error instanceof ApiError) {
    if (error.status === 429) return { ok: false, error: "Too many attempts. Please try again in a few minutes." };
    if (error.code === "MPIN_INVALID") {
      const left = Number(error.details?.attempts_remaining);
      return Number.isFinite(left) ? { ok: false, error: "Wrong MPIN. {count} tries left.", vars: { count: left } } : { ok: false, error: "Wrong mobile number or MPIN" };
    }
    if (error.code === "MPIN_LOCKED") return { ok: false, error: "Too many wrong MPINs. Verify your number on WhatsApp to set a new one." };
    if (error.code === "ACCOUNT_SUSPENDED" || error.code === "ACCOUNT_DELETED") return { ok: false, error: "This account is blocked. Contact us for help." };
    if (error.field("otp") || error.field("code")) return { ok: false, error: "That code is not right" };
    if (error.field("phone_number") || error.field("country_code")) return { ok: false, error: "Enter a valid mobile number" };
    if (error.field("mpin")) {
      const message = error.field("mpin") ?? "";
      if (/match|confirm/i.test(message)) return { ok: false, error: "The two MPINs do not match" };
      if (/predictable|easy|weak|guess|common|sequen|repeat/i.test(message)) return { ok: false, error: "This MPIN is too easy to guess. Choose another." };
      return { ok: false, error: "Your MPIN must be 6 digits" };
    }
    if (error.field("current_mpin")) return { ok: false, error: "Wrong MPIN" };
    if (/whatsapp/i.test(error.message)) return { ok: false, error: "Could not send the code on WhatsApp. Please try again." };
    if (error.status === 401) return { ok: false, error: "This step has expired. Verify your number again." };
  }
  console.error("[auth]", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** "98250 12345" → the API's WhatsApp identity. */
function identity(mobile: string) {
  let digits = mobile.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? { channel: "whatsapp", country_code: "+91", phone_number: digits } : null;
}

/** Mobile entered: the API answers whether this number logs in with its MPIN or a WhatsApp code was sent. */
export async function startLoginAction(mobile: string, forceCode = false): Promise<AuthResult<{ method: "otp" | "mpin"; devCode?: string }>> {
  const who = identity(mobile);
  if (!who) return { ok: false, error: "Enter a valid mobile number" };
  try {
    const result = await api<{ method: "otp" | "mpin"; data?: { otp?: string } }>("/auth/request", {
      method: "POST",
      body: { ...who, ...(forceCode && { force_otp: true }) },
      client: await visitorIp(),
    });
    // A local API hands back the code so it can be tested without WhatsApp; never shown in a production build.
    const devCode = process.env.NODE_ENV !== "production" ? result.data?.otp : undefined;
    return { ok: true, data: { method: result.method, ...(devCode && { devCode }) } };
  } catch (error) {
    return failure(error);
  }
}

/**
 * Checks the WhatsApp code or the MPIN (the API tells them apart) and signs in.
 * A first login, or one after "Forgot MPIN", then has to set an MPIN.
 */
export async function verifyLoginAction(mobile: string, code: string, next: string | null, stay = false): Promise<AuthResult<{ setMpin: boolean }>> {
  const who = identity(mobile);
  if (!who) return { ok: false, error: "Enter a valid mobile number" };
  if (!/^\d{6}$/.test(code.trim())) return { ok: false, error: "Enter the 6-digit code" };
  let destination: string;
  try {
    const result = await api<TokenPair>("/auth/verify", { method: "POST", body: { ...who, code: code.trim() }, client: await visitorIp() });
    setSessionCookies(await cookies(), result);
    if (result.user.mpin_required) return { ok: true, data: { setMpin: true } };
    // In a popup the visitor stays on the page: the new cookies make Next re-render it signed in.
    if (stay) return { ok: true, data: { setMpin: false } };
    destination = safeNext(next);
  } catch (error) {
    return failure(error);
  }
  redirect(destination);
}

/** Sets the 6-digit MPIN right after a WhatsApp code, then continues where the visitor was going (`stay`: right here). */
export async function setMpinAction(mpin: string, confirm: string, next: string | null, stay = false): Promise<AuthResult> {
  if (!/^\d{6}$/.test(mpin)) return { ok: false, error: "Your MPIN must be 6 digits" };
  if (mpin !== confirm) return { ok: false, error: "The two MPINs do not match" };
  try {
    const result = await withSession((token) => api<{ user: ApiUser }>("/auth/mpin", { method: "POST", token, body: { mpin, mpin_confirmation: confirm } }));
    if (result === "signed-out") return { ok: false, error: "This step has expired. Verify your number again." };
  } catch (error) {
    return failure(error);
  }
  if (stay) return { ok: true, data: undefined };
  redirect(safeNext(next));
}

export async function changeMpinAction(current: string, mpin: string, confirm: string): Promise<AuthResult> {
  if (!/^\d{6}$/.test(mpin)) return { ok: false, error: "Your MPIN must be 6 digits" };
  if (mpin !== confirm) return { ok: false, error: "The two MPINs do not match" };
  if (mpin === current) return { ok: false, error: "Choose a different MPIN" };
  try {
    const result = await withSession((token) =>
      api("/auth/mpin", { method: "POST", token, body: { current_mpin: current, mpin, mpin_confirmation: confirm } }),
    );
    return result === "signed-out" ? { ok: false, error: "This step has expired. Verify your number again." } : { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function updateNameAction(name: string): Promise<AuthResult> {
  try {
    const result = await withSession((token) => api("/user/profile", { method: "PUT", token, body: { name: name.trim().slice(0, 255) || null } }));
    return result === "signed-out" ? { ok: false, error: "This step has expired. Verify your number again." } : { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function logoutAction(everywhere = false) {
  const jar = await cookies();
  const token = await accessToken({ renew: true });
  if (token) {
    await api(everywhere ? "/auth/logout-all" : "/auth/logout", { method: "POST", token }).catch(() => undefined);
  }
  clearSessionCookies(jar);
  redirect("/login");
}

/** Deletes the account (the API keeps it restorable by support for a while), then signs out. */
export async function deleteAccountAction(): Promise<AuthResult> {
  try {
    const result = await withSession((token) => api("/user/account", { method: "DELETE", token, body: { reason: "Deleted from the website" } }));
    if (result === "signed-out") return { ok: false, error: "This step has expired. Verify your number again." };
  } catch (error) {
    return failure(error);
  }
  clearSessionCookies(await cookies());
  redirect("/");
}

/**
 * A shop's real phone and WhatsApp numbers: the API masks them for guests and
 * unmasks them for a signed-in visitor whose phone is verified.
 */
export async function revealContactAction(businessSlug: string): Promise<AuthResult<{ phone: string; whatsapp: string }> | { ok: false; error: "login" }> {
  try {
    const result = await withSession((token) =>
      api<{ data: BusinessResource }>(`/businesses/${encodeURIComponent(businessSlug)}/contact-reveal`, { method: "POST", token }),
    );
    if (result === "signed-out") return { ok: false, error: "login" };
    const phones = result.data.phones;
    const phone = phones.find((p) => p.is_primary) ?? phones[0];
    const whatsapp = phones.find((p) => p.is_whatsapp) ?? phone;
    if (!phone) return { ok: false, error: "This shop has not added a phone number yet." };
    return { ok: true, data: { phone: phone.full_number, whatsapp: whatsapp.full_number } };
  } catch (error) {
    if (error instanceof ApiError && error.code === "MPIN_SETUP_REQUIRED") return { ok: false, error: "login" };
    if (error instanceof ApiError && error.status === 403) return { ok: false, error: "Verify your mobile number to see shop contact details." };
    return failure(error);
  }
}
