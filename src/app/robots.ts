import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Pages that belong to one visitor; they carry noindex too, but there is nothing for a crawler to fetch there. */
const PRIVATE_PAGES = ["/account", "/login", "/saved", "/notifications", "/rewards", "/invite"];

/**
 * Filter, search and sort variants of the offer lists ("/offers?sort=ending"). Each one
 * names the clean list as its canonical URL, so crawling them only spends crawl budget.
 */
const LIST_VARIANTS = ["q", "sub", "type", "validity", "sort", "page"].map((param) => `/*?*${param}=`);

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PAGES, ...LIST_VARIANTS] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
