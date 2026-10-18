import { NextResponse, type NextRequest } from "next/server";
import { analyticsConfig } from "@/lib/analytics/config";
import { pickIp } from "@/lib/api/visitor";

/**
 * The browser talks to OpenPanel through here (same site, so ad blockers that list analytics domains leave it alone):
 * `/api/op/track…` goes to the self-hosted API, `/api/op/op1.js` is the tracking script from the same server.
 * Written out instead of the SDK's own handler, which fetches its script from openpanel.dev with Next's data cache.
 */
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5_000;
/** Request headers the OpenPanel script sets and the API reads. */
const PASS = ["openpanel-client-id", "openpanel-sdk-name", "openpanel-sdk-version", "user-agent"];

async function proxy(request: NextRequest, { params }: { params: Promise<{ op: string[] }> }) {
  const config = analyticsConfig();
  if (!config) return new NextResponse(null, { status: 404 });

  const path = (await params).op.join("/");
  const { search } = request.nextUrl;

  if (request.method === "GET" && path === "op1.js") {
    try {
      const upstream = await fetch(new URL(`/op1.js${search}`, config.apiUrl), { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!upstream.ok) return new NextResponse(null, { status: 502 });
      return new NextResponse(await upstream.text(), {
        headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      });
    } catch {
      return new NextResponse(null, { status: 502 });
    }
  }

  if (path !== "track" && !path.startsWith("track/")) return new NextResponse(null, { status: 404 });

  const headers = new Headers({ "Content-Type": "application/json", origin: request.headers.get("origin") ?? request.nextUrl.origin });
  for (const name of PASS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // OpenPanel places the visitor by this address, not the one this server connects from.
  const ip = pickIp(request.headers.get("cf-connecting-ip"), request.headers.get("x-real-ip"), request.headers.get("x-forwarded-for"));
  if (ip) headers.set("openpanel-client-ip", ip);

  try {
    const upstream = await fetch(`${config.apiUrl}/${path}${search}`, {
      method: request.method,
      headers,
      body: request.method === "POST" ? await request.text() : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    // Analytics being down must not look like the site being down.
    return new NextResponse(null, { status: 502 });
  }
}

export { proxy as GET, proxy as POST };
