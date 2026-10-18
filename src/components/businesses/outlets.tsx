import { ArrowRight, ChevronDown, Navigation, Phone } from "lucide-react";
import type { OpeningHours, Outlet } from "@/types";
import { Link } from "@/components/i18n/link";
import { WhatsAppIcon } from "@/components/icons/brand";
import { ShareButton } from "@/components/offers/share-button";
import { buttonClass } from "@/components/ui/button";
import { RatingInline } from "@/components/ui/rating";
import { getT } from "@/lib/i18n/server";
import { cn, directionsHref } from "@/lib/utils";
import { ShopAvatar } from "./avatar";
import { ContactLink } from "./contact-link";
import { HoursTable, OpenStatusPill } from "./opening-hours";

interface SideContact {
  slug: string;
  name: string;
  logo?: string;
  phone: string;
  whatsapp: string;
  contactMasked: boolean;
  geo: { lat: number; lng: number };
  hours: OpeningHours[];
}

/**
 * One card per outlet; with several, the branch name sits on the card's top border (numbered like the map's pins on desktop). Each has the shop's name, the outlet's address, whether it is open,
 * its weekly hours folded away until opened, and four icon buttons (call, WhatsApp, directions, share) after them.
 * With `storeHref` (pages that are not the shop's own) each card ends with a link to the shop's page (labelled "View outlet").
 */
export async function OutletSideCards({ outlets, contact, path, storeHref }: { outlets: Outlet[]; contact: SideContact; path: string; storeHref?: string }) {
  const t = await getT();
  const many = outlets.length > 1;
  const iconClass = (variant: "primary" | "outline" | "whatsapp") => buttonClass({ variant, size: "sm", block: true, className: "px-0" });
  return (
    <>
      {outlets.map((outlet, i) => {
        const geo = outlet.geo ?? contact.geo;
        const hours = outlet.hours.length ? outlet.hours : contact.hours;
        const rating = outlet.rating && <RatingInline rating={outlet.rating} className="shrink-0 text-body-sm text-muted" />;
        return (
          <section key={outlet.id} className={cn("relative rounded-2xl border border-line bg-white", many && "mt-3")}>
            {/* With several outlets the branch name sits on the card's top border, like a legend. */}
            {many && (
              <h3 className={cn("absolute -top-3 left-4 flex items-center gap-1.5 bg-white px-2 text-body-sm leading-6 font-semibold lg:left-6", outlet.isMain ? "text-primary" : "text-ink")}>
                <span aria-hidden className="hidden size-5 shrink-0 items-center justify-center rounded-full bg-ink text-micro font-semibold text-white lg:flex">
                  {i + 1}
                </span>
                {outlet.name}
                {outlet.isMain && !/main/i.test(outlet.name) && <span className="text-caption font-medium text-muted">{t("Main outlet")}</span>}
              </h3>
            )}
            <div className="overflow-hidden rounded-2xl">
              <div className={cn("flex flex-col gap-3 p-4 lg:gap-4 lg:p-6", many && "pt-6 lg:pt-8")}>
                <div className="flex items-center gap-3">
                  <ShopAvatar logo={contact.logo} className="size-11 border-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="min-w-0 text-body font-semibold">{contact.name}</p>
                      {rating}
                    </div>
                    <p className="mt-0.5 text-body-sm leading-relaxed text-muted">{outlet.address}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <ContactLink business={contact.slug} kind="call" number={contact.phone} masked={contact.contactMasked} className={iconClass("primary")}>
                    <Phone size={18} aria-hidden />
                    <span className="sr-only">{t("Call")}</span>
                  </ContactLink>
                  <ContactLink business={contact.slug} kind="whatsapp" number={contact.whatsapp} masked={contact.contactMasked} className={iconClass("whatsapp")}>
                    <WhatsAppIcon size={18} />
                    <span className="sr-only">WhatsApp</span>
                  </ContactLink>
                  <a href={directionsHref(geo.lat, geo.lng)} target="_blank" rel="noreferrer" className={iconClass("outline")}>
                    <Navigation size={18} aria-hidden />
                    <span className="sr-only">{t("Directions")}</span>
                  </a>
                  <ShareButton title={contact.name} path={path} variant="tile" />
                </div>
              </div>
              <details className="group border-t border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-body font-semibold lg:px-6 lg:py-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 flex-col gap-1">
                    {t("Opening hours")}
                    <OpenStatusPill hours={hours} className="min-h-0 bg-transparent p-0 text-body-sm font-normal text-muted" />
                  </span>
                  <ChevronDown aria-hidden className="size-[18px] shrink-0 text-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 lg:px-6 lg:pb-5">
                  <HoursTable hours={hours} compact />
                </div>
              </details>
              {storeHref && (
                <Link href={storeHref} className="flex items-center justify-between border-t border-line px-4 py-3 text-body font-semibold text-primary hover:bg-surface lg:px-6 lg:py-4">
                  {t("View outlet")}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
