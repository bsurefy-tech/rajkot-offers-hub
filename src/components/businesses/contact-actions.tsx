import { Navigation, Phone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand";
import { TrackedAnchor } from "@/components/offers/track";
import { Button, buttonClass } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { cn, directionsHref, instagramHref } from "@/lib/utils";
import { ContactLink } from "./contact-link";

interface Contact {
  slug: string;
  phone: string;
  whatsapp: string;
  contactMasked: boolean;
  geo: { lat: number; lng: number };
  instagram?: string;
}

const external = { target: "_blank", rel: "noreferrer" } as const;

const tileClass = "flex h-[72px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface text-caption font-medium hover:bg-canvas";
const whatsappTileClass = "flex h-[72px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl bg-whatsapp-soft text-caption font-medium text-whatsapp-ink hover:bg-whatsapp/15";

/** Call (icon only), WhatsApp and directions (icon and text) in one row. */
export async function ContactRow({
  contact,
  disabled,
  offerId,
  className,
}: {
  contact: Contact;
  /** On an offer page: taps count towards that offer's stats. */
  offerId?: string;
  /** Expired offer: call and WhatsApp are disabled. */
  disabled?: boolean;
  className?: string;
}) {
  const t = await getT();
  return (
    <div className={cn("flex gap-2", className)}>
      {disabled ? (
        <Button iconOnly disabled aria-label={t("Call")}>
          <Phone size={20} aria-hidden />
        </Button>
      ) : (
        <ContactLink business={contact.slug} kind="call" number={contact.phone} masked={contact.contactMasked} offerId={offerId} className={buttonClass({ iconOnly: true })}>
          <Phone size={20} aria-hidden />
          <span className="sr-only">{t("Call")}</span>
        </ContactLink>
      )}
      {disabled ? (
        <Button variant="outline" disabled className="min-w-0 shrink flex-1 px-2.5">
          <WhatsAppIcon size={20} />
          WhatsApp
        </Button>
      ) : (
        <ContactLink business={contact.slug} kind="whatsapp" number={contact.whatsapp} masked={contact.contactMasked} offerId={offerId} className={buttonClass({ variant: "whatsappSolid", className: "min-w-0 shrink flex-1 px-2.5" })}>
          <WhatsAppIcon size={20} />
          WhatsApp
        </ContactLink>
      )}
      <TrackedAnchor
        href={directionsHref(contact.geo.lat, contact.geo.lng)}
        {...external}
        offerId={offerId}
        event="directions"
        className={buttonClass({ variant: "outline", className: "min-w-0 shrink flex-1 px-2.5" })}
      >
        <Navigation size={18} aria-hidden />
        {t("Directions")}
      </TrackedAnchor>
    </div>
  );
}

/** Mobile bar fixed to the bottom of offer and business pages: WhatsApp, directions and call, or what the page puts there instead. */
export function StickyActionBar({
  contact,
  disabled,
  offerId,
  lead,
  children,
}: {
  /** Leave out to show no contact buttons (the page shows them elsewhere). */
  contact?: Contact;
  /** Shown above the buttons, inside the same bar (an offer's code). */
  children?: React.ReactNode;
  /** A row of main actions above the contact buttons (save and share). */
  lead?: React.ReactNode;
  /** On an offer page: taps count towards that offer's stats. */
  offerId?: string;
  /** Expired offer: call and WhatsApp are disabled. */
  disabled?: boolean;
}) {
  return (
    <div data-bottom-bar className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-3 border-t border-line bg-white px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] lg:hidden">
      {children}
      {lead && <div className="flex gap-2.5">{lead}</div>}
      {contact && <ContactRow contact={contact} disabled={disabled} offerId={offerId} />}
    </div>
  );
}

/** Grey icon tiles (call, WhatsApp, directions, Instagram). */
export async function ActionTiles({ contact, includeCall, className }: { contact: Contact; includeCall?: boolean; className?: string }) {
  const t = await getT();
  const tiles: { label: string; icon: React.ReactNode; href?: string; contact?: "call" | "whatsapp"; ext?: boolean }[] = [
    ...(includeCall ? [{ label: t("Call"), icon: <Phone size={22} aria-hidden />, contact: "call" as const }] : []),
    { label: "WhatsApp", icon: <WhatsAppIcon size={22} />, contact: "whatsapp" },
    { label: t("Directions"), icon: <Navigation size={22} aria-hidden />, href: directionsHref(contact.geo.lat, contact.geo.lng), ext: true },
    ...(contact.instagram
      ? [{ label: "Instagram", icon: <InstagramIcon size={22} />, href: instagramHref(contact.instagram), ext: true }]
      : []),
  ];
  return (
    <ul className={cn("grid gap-2.5", tiles.length === 4 ? "grid-cols-4" : "grid-cols-3", className)}>
      {tiles.map((tile) => (
        <li key={tile.label}>
          {tile.contact ? (
            <ContactLink
              business={contact.slug}
              kind={tile.contact}
              number={tile.contact === "call" ? contact.phone : contact.whatsapp}
              masked={contact.contactMasked}
              className={tile.contact === "whatsapp" ? whatsappTileClass : tileClass}
            >
              {tile.icon}
              {tile.label}
            </ContactLink>
          ) : (
            <a href={tile.href} {...(tile.ext ? external : {})} className={tileClass}>
              {tile.icon}
              {tile.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
