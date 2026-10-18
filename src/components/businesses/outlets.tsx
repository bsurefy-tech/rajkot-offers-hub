import { ArrowRight, ChevronDown, Navigation, Phone } from "lucide-react";
import type { OpeningHours, Outlet } from "@/types";
import { Link } from "@/components/i18n/link";
import { WhatsAppIcon } from "@/components/icons/brand";
import { ShareButton } from "@/components/offers/share-button";
import { buttonClass } from "@/components/ui/button";
import { RatingInline } from "@/components/ui/rating";
import { getT } from "@/lib/i18n/server";
import { directionsHref } from "@/lib/utils";
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
 * One card per outlet, numbered like the map's pins. Each has the shop's name, the outlet's address, whether it is open,
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
        return (
          <section key={outlet.id} className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex flex-col gap-3 p-4 lg:gap-4 lg:p-6">
              <div className="flex items-center gap-3">
                <ShopAvatar logo={contact.logo} className="size-11 border-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold">{contact.name}</p>
                  {many && (
                    <p className="mt-0.5 flex items-center gap-2 text-body-sm font-medium">
                      <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-micro font-semibold text-white">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        {outlet.name}
                        {outlet.isMain && !/main/i.test(outlet.name) && <span className="ml-2 text-caption font-medium text-muted">{t("Main outlet")}</span>}
                      </span>
                    </p>
                  )}
                  <p className="mt-0.5 text-body-sm leading-relaxed text-muted">{outlet.address}</p>
                </div>
              </div>
              {outlet.rating && <RatingInline rating={outlet.rating} className="text-body-sm text-muted" />}
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
          </section>
        );
      })}
    </>
  );
}
