import type { NextConfig } from "next";

/** Offer and shop photos come from the API's media host(s): MEDIA_PUBLIC_URL, comma-separated when there are several. */
const mediaUrls = (process.env.MEDIA_PUBLIC_URL ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)
  .map((url) => new URL(url));

function mediaPatterns() {
  return mediaUrls.map((url) => ({
    protocol: url.protocol.replace(":", "") as "https" | "http",
    hostname: url.hostname,
    ...(url.port && { port: url.port }),
    pathname: `${url.pathname.replace(/\/$/, "")}/**`,
  }));
}

/** A local API in development serves its media from localhost, which next/image refuses unless allowed. */
const localMedia = process.env.NODE_ENV !== "production" && mediaUrls.some((url) => url.hostname === "localhost" || url.hostname === "127.0.0.1");

const nextConfig: NextConfig = {
  images: {
    // Every image is shown as the file it is, never resized per request: the API makes each photo's 150px, 640px and
    // 1600px versions once, at upload, and the site picks the one that fits (`@/lib/images`); Unsplash artwork asks
    // for its width in the URL. Resizing through Cloudflare Images billed every photo × width a visitor or crawler
    // fetched — 77k transformations in two days (Nov 2026).
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**" }, ...mediaPatterns()],
    ...(localMedia && { dangerouslyAllowLocalIP: true }),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
