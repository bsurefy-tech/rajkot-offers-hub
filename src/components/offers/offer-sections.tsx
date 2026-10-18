import Image from "next/image";
import { Link } from "@/components/i18n/link";
import { ArrowRight, MapPin, Navigation, Store } from "lucide-react";
import type { OfferStep } from "@/types";
import { AccordionItem } from "@/components/ui/accordion";
import { buttonClass } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { cn, directionsHref } from "@/lib/utils";
import { TrackedAnchor } from "./track";
import { shopPath } from "@/lib/paths";

/** Store icon, name and area, linking to the business profile. */
export async function BusinessRow({
  slug,
  name,
  area,
  logo,
}: {
  slug: string;
  name: string;
  area: string;
  logo?: string;
}) {
  const t = await getT();
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface">
        {logo ? <Image src={logo} alt="" fill sizes="44px" className="object-cover" /> : <Store size={20} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold">{name}</p>
        <p className="truncate text-body-sm text-muted">{t("{area}, Rajkot", { area })}</p>
      </div>
      <Link
        href={shopPath(slug)}
        className="inline-flex shrink-0 items-center gap-1 text-body font-semibold text-primary hover:underline"
      >
        {t("View store")}
        <ArrowRight size={15} aria-hidden />
      </Link>
    </div>
  );
}

/** "How to get this offer" box with numbered steps. */
export async function HowToGetSteps({ steps }: { steps: OfferStep[] }) {
  const t = await getT();
  return (
    <section className="rounded-2xl bg-surface p-4 lg:p-6">
      <h2 className="mb-4 text-heading font-semibold">{t("How to get this offer")}</h2>
      <ol className="flex flex-col gap-3 lg:gap-4">
        {steps.map((step, i) => (
          <li key={step.text} className="flex items-center gap-3 text-body">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-white text-body-sm font-semibold">
              {i + 1}
            </span>
            {step.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function TermsAccordion({ terms }: { terms: string[] }) {
  const t = await getT();
  return (
    <AccordionItem variant="card" title={t("Terms and conditions")} defaultOpen>
      <ul className="flex flex-col gap-2.5">
        {terms.map((term) => (
          <li key={term} className="flex gap-2.5 text-body-sm leading-relaxed text-muted">
            <span aria-hidden className="mt-[9px] size-1 shrink-0 rounded-full bg-faint" />
            {term}
          </li>
        ))}
      </ul>
    </AccordionItem>
  );
}

/** Map placeholder with address and a directions button. */
export async function MapCard({
  address,
  geo,
  layout = "stacked",
  offerId,
  className,
}: {
  address: string;
  geo: { lat: number; lng: number };
  layout?: "stacked" | "split";
  /** On an offer page: the tap counts towards that offer's stats. */
  offerId?: string;
  className?: string;
}) {
  const t = await getT();
  return (
    <section
      aria-label={t("Map")}
      className={cn(
        "overflow-hidden rounded-2xl border border-line",
        layout === "split" && "lg:grid lg:grid-cols-2",
        className,
      )}
    >
      <div className={cn("map-stripes relative flex h-[140px] items-center justify-center", layout === "split" && "lg:h-full lg:min-h-[180px]")}>
        <span className="flex size-9 items-center justify-center rounded-full bg-ink text-white shadow-float">
          <MapPin size={18} aria-hidden />
        </span>
      </div>
      <div className="flex flex-col items-start gap-3 p-4 lg:p-5">
        {layout === "split" && <p className="text-caption text-muted">{t("Address")}</p>}
        <p className="text-body leading-relaxed">{address}</p>
        <TrackedAnchor
          href={directionsHref(geo.lat, geo.lng)}
          target="_blank"
          rel="noreferrer"
          offerId={offerId}
          event="directions"
          className={buttonClass({ variant: "outline", className: "h-[38px] px-4 text-body" })}
        >
          <Navigation size={16} aria-hidden />
          {t("Get directions")}
        </TrackedAnchor>
      </div>
    </section>
  );
}
