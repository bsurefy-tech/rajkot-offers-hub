import { Link } from "@/components/i18n/link";
import { MapPin } from "lucide-react";
import { offersPath } from "@/lib/areas";
import { getAreasWithCounts, getOffers } from "@/lib/data";
import { getT } from "@/lib/i18n/server";
import type { Area, Category } from "@/types";

/** Most areas linked from one list; the busiest come first. */
const MAX_AREAS = 12;

/**
 * Links from an offers list to the same list in other areas ("Offers in other areas of Rajkot").
 * Shoppers searching "offers in Mavdi" land on the area pages, and these links are how they
 * (and search engines) get from one area to the next. Only areas with something live are linked,
 * and on a category page only areas with live offers in that category.
 */
export async function AreaLinks({ area, category }: { area?: Area; category?: Category }) {
  const t = await getT();
  const { areas } = await getAreasWithCounts();
  const others = areas.filter((a) => a.offerCount > 0 && a.slug !== area?.slug).slice(0, MAX_AREAS);

  // Area and category together: the area's total says nothing about this category, so ask for it.
  const counts = category
    ? await Promise.all(others.map((a) => getOffers({ areas: [a.slug], category: category.slug }).then((r) => r.total)))
    : others.map((a) => a.offerCount);
  const links = others.map((a, i) => ({ area: a, count: counts[i] })).filter((l) => l.count > 0);
  if (!links.length) return null;

  const heading = category
    ? t("{category} offers by area", { category: category.shortName })
    : area
      ? t("Offers in other areas of Rajkot")
      : t("Offers by area in Rajkot");

  return (
    <section aria-labelledby="area-links" className="mt-10 border-t border-line pt-8 lg:mt-14 lg:pt-10">
      <h2 id="area-links" className="mb-4 text-heading font-semibold">
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-2 lg:gap-3">
        {links.map(({ area: a, count }) => (
          <li key={a.slug}>
            <Link
              href={offersPath(a.slug, category?.slug)}
              className="inline-flex h-[38px] items-center gap-1.5 rounded-full border border-input bg-white px-4 text-body font-medium whitespace-nowrap transition-colors hover:border-ink lg:h-10"
            >
              <MapPin size={15} className="text-muted" aria-hidden />
              {a.name}
              <span className="text-muted">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
