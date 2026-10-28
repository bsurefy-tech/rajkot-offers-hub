/**
 * The BSurefy (Laravel) API. Rajkot Offers is one platform there, chosen by the
 * host the request goes to (or, on the shared management host, by `X-Platform`).
 *
 *   RAJKOT_API_URL       e.g. https://v2-api.rajkotoffershub.com
 *   RAJKOT_API_PLATFORM  only on the management host: rajkot-offers
 *   API_FRONTEND_KEY     the API's WEB_FRONTEND_KEY, so it believes the visitor address
 *                        sent with request-time calls (`client`) for rate limits and metrics
 *
 * Server-side only: the browser never calls the API directly, so tokens stay in
 * httpOnly cookies and guest reads go through Next's cache.
 */

import { trackServer } from "@/lib/analytics/server";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly errors?: Record<string, string[]>,
    readonly retryAfter?: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** First validation message for `field`, if any. */
  field(field: string) {
    return this.errors?.[field]?.[0];
  }
}

export function apiBaseUrl() {
  const url = process.env.RAJKOT_API_URL;
  if (!url) throw new Error("RAJKOT_API_URL is not set. Copy .env.example to .env.local and fill it in.");
  return url.replace(/\/+$/, "");
}

const GUEST_REVALIDATE_SECONDS = 60;

type Query = Record<string, string | number | boolean | undefined | null | (string | number)[]>;

export interface ApiRequest {
  query?: Query;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer access token for signed-in calls. */
  token?: string;
  /**
   * The visitor's IP, for calls made on their behalf at request time (logins, refreshes, code
   * reveals, tracking). Every call comes from this server, so without it the API would rate-limit
   * and count all visitors as one. Never set inside a cached read.
   */
  client?: string | null;
  /** Extra headers, e.g. the guest's device key. */
  headers?: Record<string, string>;
  /** Never cached, even as a guest read: the answer is different for every viewer. */
  fresh?: boolean;
}

function search(query: Query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, String(v)));
    else params.set(key, String(value));
  }
  return params.size ? `?${params}` : "";
}

export async function api<T>(path: string, { query, method = "GET", body, token, client, headers: extra, fresh }: ApiRequest = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  // A FormData body (a file upload) sets its own multipart Content-Type.
  const upload = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !upload) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (process.env.RAJKOT_API_PLATFORM) headers["X-Platform"] = process.env.RAJKOT_API_PLATFORM;
  if (client && process.env.API_FRONTEND_KEY) {
    headers["X-Client-IP"] = client;
    headers["X-Frontend-Key"] = process.env.API_FRONTEND_KEY;
  }

  const endpoint = `${method} /${path.split("/")[1] ?? ""}`;
  const response = await fetch(`${apiBaseUrl()}${path}${search(query)}`, {
    method,
    headers,
    body: body === undefined ? undefined : upload ? (body as FormData) : JSON.stringify(body),
    // Guest reads are shared by every visitor, so they are cached for a minute (the API caches too).
    // Anything personal, or that changes data, is never cached.
    ...(method === "GET" && !token && !client && !fresh ? { next: { revalidate: GUEST_REVALIDATE_SECONDS } } : { cache: "no-store" as const }),
  }).catch((error: unknown) => {
    trackServer("api_error", { endpoint, status: 0 });
    throw error;
  });
  if (response.status === 204) return undefined as T;

  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    if (response.status >= 500) trackServer("api_error", { endpoint, status: response.status });
    const retry = Number(response.headers.get("retry-after"));
    throw new ApiError(
      response.status,
      typeof json.message === "string" ? json.message : `API ${response.status}`,
      typeof json.code === "string" ? json.code : undefined,
      json.errors as Record<string, string[]> | undefined,
      Number.isFinite(retry) && retry > 0 ? retry : undefined,
      json,
    );
  }
  return json as T;
}

/** A 404 from the API as `undefined`, so pages can call `notFound()`. */
export async function orUndefined<T>(request: Promise<T>): Promise<T | undefined> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined;
    throw error;
  }
}
