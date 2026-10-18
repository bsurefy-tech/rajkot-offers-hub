import { analyticsConfig } from "./config";

/**
 * Events only the server can see, sent straight to OpenPanel (no browser, no proxy). Needs the project's client secret
 * (`OPENPANEL_CLIENT_SECRET`, a Worker secret); without it nothing is sent. Fire and forget: it never slows or breaks a request.
 */
type ServerEvents = {
  /** The API answered 5xx (status) or could not be reached (status 0). `endpoint` is the method and first path segment only. */
  api_error: { endpoint: string; status: number };
};

/** The same event at most once a minute per Worker instance, so an API outage is one signal, not thousands. */
const QUIET_MS = 60_000;
const recent = new Map<string, number>();

/** Keeps the request alive until the send finishes on Cloudflare Workers; elsewhere it just runs. */
function keepAlive(work: Promise<unknown>) {
  const context = (globalThis as Record<symbol, { ctx?: { waitUntil?: (work: Promise<unknown>) => void } } | undefined>)[Symbol.for("__cloudflare-context__")];
  context?.ctx?.waitUntil?.(work);
}

export function trackServer<E extends keyof ServerEvents>(name: E, properties: ServerEvents[E]) {
  const config = analyticsConfig();
  const secret = process.env.OPENPANEL_CLIENT_SECRET;
  if (!config || !secret) return;

  const key = `${name}:${JSON.stringify(properties)}`;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < QUIET_MS) return;
  if (recent.size > 200) recent.clear();
  recent.set(key, now);

  const work = fetch(`${config.apiUrl}/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "openpanel-client-id": config.clientId, "openpanel-client-secret": secret },
    body: JSON.stringify({ type: "track", payload: { name, properties: { ...properties, source: "server" } } }),
    signal: AbortSignal.timeout(3_000),
  }).catch(() => undefined);
  keepAlive(work);
}
