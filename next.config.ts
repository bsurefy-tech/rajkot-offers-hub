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
    // The widest layout is 1240px, so 1200 covers it and 1920 a 2x phone or laptop. Cloudflare bills every width of
    // every photo it resizes, so the list stays short: 750 and 1080 sat within 10% of 828 and 1200, and the default
    // 2048 and 3840 only made every srcset (and the preload links in the page head) longer.
    deviceSizes: [640, 828, 1200, 1920],
    // Logos, avatars and thumbnails (32–96px shown, so 64–192px on a 2x screen). The default also had 16, 32, 48 and
    // 96: one more billed size per image for a few hundred bytes saved.
    imageSizes: [64, 128, 256, 384],
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
