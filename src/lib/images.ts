import type { Media } from "@/lib/api/types";

/**
 * Photos come from the API already resized: the API makes a 640px (`medium`) and a 1600px (`large`)
 * WebP of every photo once, at upload, and sends their URLs beside the original. The site shows those
 * files as they are (`images.unoptimized`), so nothing is resized per request and Cloudflare Images
 * bills nothing. Until the API has made a size it sends the original in its place.
 *
 *   medium  cards, grids, tiles and the photo rows (about 300px on screen, so 640 covers 2x)
 *   large   a page's main photo, the full-screen viewer and banners
 */
export type ImageSize = "medium" | "large";

/** The medium and large URL of each photo, by its original URL (the key the components already pass around). */
export type ImageSizes = Record<string, Partial<Record<ImageSize, string>>>;

/** One photo at `size`; the original when the API sent no such size (an older API, or a photo not resized yet). */
export function sized(media: Pick<Media, "url" | "medium_url" | "large_url">, size: ImageSize) {
  return (size === "medium" ? media.medium_url : media.large_url) || media.url;
}

/** {@link ImageSizes} for a list of API photos; empty entries are skipped. */
export function sizesOf(media: (Media | null | undefined)[]): ImageSizes {
  return Object.fromEntries(
    media.flatMap((m) => (m ? [[m.url, { ...(m.medium_url ? { medium: m.medium_url } : {}), ...(m.large_url ? { large: m.large_url } : {}) }]] : [])),
  );
}

/** `src` at `size` when `sizes` knows it, else `src` itself. */
export function pick(sizes: ImageSizes | undefined, src: string, size: ImageSize) {
  return sizes?.[src]?.[size] ?? src;
}
