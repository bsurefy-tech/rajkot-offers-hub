"use client";

import { Check, ChevronDown, LocateFixed, MapPin } from "lucide-react";
import NextLink from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Sheet } from "@/components/ui/sheet";
import { isAreaScoped, stripArea } from "@/lib/areas";
import { localizePath, splitLocale } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatOfferCount } from "@/lib/format";
import { NEAR_CHANGED_EVENT, parseNear, PICK_LOCATION_EVENT, readNearCookie, subscribeNear } from "@/lib/location";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { AreaWithCount } from "@/types";
import { NearMe } from "./near-me";

interface LocationPickerProps {
  areas: AreaWithCount[];
  /** Live offers across all of Rajkot. */
  total: number;
  /** Needed to tell "/offers/electronics" (a category list) from "/offers/<offer>" (a single offer). */
  categorySlugs: string[];
}

const pillClass =
  "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-white pr-2.5 pl-2.5 text-body-sm font-medium lg:h-10 lg:px-3.5";

/**
 * Header city pill. Opens "near me" (GPS, kept in a cookie) and a list
 * of Rajkot's areas; picking an area moves to that area's version of the page
 * ("/kalawad-road/offers"), "All Rajkot" moves back to the plain one ("/offers").
 * The area lives in the URL, so it can be shared and needs no extra storage.
 */
export function LocationPicker(props: LocationPickerProps) {
  const t = useT();
  return (
    // Reading the query string needs a Suspense boundary; until it resolves the pill reads "Rajkot".
    <Suspense
      fallback={
        <button type="button" disabled className={cn(pillClass, "border-line")}>
          <MapPin size={15} aria-hidden />
          {t(site.city)}
          <ChevronDown size={14} className="text-muted" aria-hidden />
        </button>
      }
    >
      <Picker {...props} />
    </Suspense>
  );
}

function Picker({ areas, total, categorySlugs }: LocationPickerProps) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const pill = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { area: currentSlug } = useParams<{ area?: string }>();
  const near = parseNear(useSyncExternalStore(subscribeNear, readNearCookie, () => null));

  const current = areas.find((area) => area.slug === currentSlug);
  const label = current ? current.name : near ? t("Near me") : t(site.city);
  const narrowed = Boolean(current || near);

  // "Nearest first" (and other buttons) ask for a location through an event. The header is
  // drawn twice (desktop and mobile); only the visible pill opens its sheet.
  useEffect(() => {
    const pick = () => {
      if (pill.current?.offsetParent) setOpen(true);
    };
    window.addEventListener(PICK_LOCATION_EVENT, pick);
    return () => window.removeEventListener(PICK_LOCATION_EVENT, pick);
  }, []);

  // The offers and categories pages exist per area, so stay on the same page (and keep its
  // search, category and sort); from any other page go to the offers list.
  const page = stripArea(splitLocale(pathname).path, currentSlug);
  const categoryList = /^\/offers\/([^/?#]+)$/.exec(page)?.[1];
  const scoped = isAreaScoped(page) || (categoryList !== undefined && categorySlugs.includes(categoryList));

  function hrefFor(slug?: string) {
    const params = new URLSearchParams(scoped ? searchParams.toString() : "");
    // Drop the page and any leftover old-style area/category params; both now live in the path.
    params.delete("page");
    params.delete("area");
    params.delete("category");
    const query = params.toString();
    const base = scoped ? page : "/offers";
    return localizePath(locale, `${slug ? `/${slug}` : ""}${base}${query ? `?${query}` : ""}`);
  }

  /** This list (or all offers), nearest first. */
  function nearestHref() {
    const params = new URLSearchParams(scoped ? searchParams.toString() : "");
    params.delete("page");
    params.set("sort", "nearest");
    return localizePath(locale, `${currentSlug ? `/${currentSlug}` : ""}${scoped ? page : "/offers"}?${params}`);
  }

  function nearChanged() {
    window.dispatchEvent(new Event(NEAR_CHANGED_EVENT));
  }

  return (
    <>
      <button
        ref={pill}
        type="button"
        aria-haspopup="dialog"
        aria-label={t("Choose your area")}
        onClick={() => setOpen(true)}
        className={cn(pillClass, narrowed ? "border-primary text-primary" : "border-line hover:border-input")}
      >
        {near && !current ? <LocateFixed size={15} aria-hidden /> : <MapPin size={15} aria-hidden />}
        <span className="max-w-[110px] truncate lg:max-w-[200px]">{label}</span>
        <ChevronDown size={14} className={narrowed ? "" : "text-muted"} aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("Choose your area")}>
        <NearMe
          near={near}
          onLocated={() => {
            nearChanged();
            setOpen(false);
            router.replace(nearestHref(), { scroll: false });
          }}
          onCleared={() => {
            nearChanged();
            router.refresh();
          }}
        />
        <p className="px-3 pt-3 pb-1 text-caption font-semibold tracking-[0.04em] text-muted">{t("Areas")}</p>
        <ul className="flex flex-col gap-0.5 pb-1">
          <AreaRow
            href={hrefFor()}
            selected={!narrowed}
            name={t("All Rajkot")}
            count={formatOfferCount(total, t)}
            onPick={() => setOpen(false)}
          />
          <li aria-hidden className="mx-3 my-1 h-px bg-line" />
          {areas.map((area) => (
            <AreaRow
              key={area.slug}
              href={hrefFor(area.slug)}
              selected={area.slug === currentSlug}
              name={area.name}
              count={formatOfferCount(area.offerCount, t)}
              onPick={() => setOpen(false)}
            />
          ))}
        </ul>
      </Sheet>
    </>
  );
}

function AreaRow({
  href,
  selected,
  name,
  count,
  onPick,
}: {
  href: string;
  selected: boolean;
  name: string;
  count: string;
  onPick: () => void;
}) {
  return (
    <li>
      <NextLink
        href={href}
        aria-current={selected ? "true" : undefined}
        onClick={onPick}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3 text-body transition-colors",
          selected ? "bg-primary-soft font-medium" : "hover:bg-surface",
        )}
      >
        {selected ? (
          <Check size={18} className="shrink-0 text-primary" aria-hidden />
        ) : (
          <MapPin size={18} className="shrink-0 text-faint" aria-hidden />
        )}
        <span className="flex-1">{name}</span>
        <span className={cn("text-body-sm", selected ? "text-primary" : "text-muted")}>{count}</span>
      </NextLink>
    </li>
  );
}
