import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, ChevronRight, Mail, MapPin, Phone } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand";
import { TrackClick } from "@/components/analytics/track-click";
import { Container } from "@/components/layout/container";
import { ButtonAnchor } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/display";
import type { EventMap } from "@/lib/analytics/events";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { instagramHref, telHref, whatsappHref } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Contact"),
    description: t("Questions, suggestions or offer details: tell Rajkot Offers Hub."),
    path: "/contact",
  });
}

async function ReportBox() {
  const t = await getT();
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-body leading-relaxed">{t("Spotted an incorrect offer? Tell us and we will look into it.")}</p>
      <TrackClick event="contact_click" properties={{ kind: "report_offer" }}>
        <a
          href={whatsappHref(site.whatsapp, t("I want to report an offer:"))}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-body font-semibold text-primary hover:underline"
        >
          {t("Report it")}
          <ArrowRight size={14} aria-hidden />
        </a>
      </TrackClick>
    </div>
  );
}

export default async function ContactPage() {
  const t = await getT();
  const channels: { kind?: EventMap["contact_click"]["kind"]; title: string; value: string; icon: ReactNode; href?: string }[] = [
    { kind: "whatsapp", title: "WhatsApp", value: site.whatsapp, icon: <WhatsAppIcon size={20} />, href: whatsappHref(site.whatsapp) },
    { kind: "phone", title: t("Phone"), value: site.phone, icon: <Phone size={20} aria-hidden />, href: telHref(site.phone) },
    { kind: "email", title: t("Email"), value: site.email, icon: <Mail size={20} aria-hidden />, href: `mailto:${site.email}` },
    { kind: "instagram", title: "Instagram", value: site.instagram, icon: <InstagramIcon size={20} />, href: instagramHref(site.instagram) },
    { title: t("Location"), value: t(site.location), icon: <MapPin size={20} aria-hidden /> },
  ];

  return (
    <>
      <Container className="pt-8 pb-8 lg:pt-20 lg:pb-12">
        <Eyebrow>{t("Contact")}</Eyebrow>
        <h1 className="mt-2 text-display leading-tight font-semibold">{t("Contact us")}</h1>
        <p className="mt-3 text-heading text-muted">{t("Questions, suggestions or offer details: let us know.")}</p>
      </Container>

      <Container className="flex flex-col gap-8 pb-10 lg:grid lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-12 lg:pb-20">
        <div className="flex flex-col gap-3">
          {channels.map((c) => {
            const body = (
              <>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface">{c.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">{c.title}</span>
                  <span className="block truncate text-body-sm text-muted">{c.value}</span>
                </span>
                {c.href && <ChevronRight size={18} className="text-muted" aria-hidden />}
              </>
            );
            const classes = "flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition-colors";
            return c.href && c.kind ? (
              <TrackClick key={c.title} event="contact_click" properties={{ kind: c.kind }}>
                <a href={c.href} target="_blank" rel="noreferrer" className={`${classes} hover:border-ink`}>
                  {body}
                </a>
              </TrackClick>
            ) : (
              <div key={c.title} className={classes}>
                {body}
              </div>
            );
          })}
          <div className="mt-3 hidden lg:block">
            <ReportBox />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-line bg-white p-4 lg:p-8">
            <h2 className="text-heading font-semibold">{t("The quickest way to reach us")}</h2>
            <p className="mt-2 text-body-sm text-muted">{t("Message us on WhatsApp with your question or the offer you want to tell us about. We reply on working days.")}</p>
            <TrackClick event="contact_click" properties={{ kind: "whatsapp" }}>
              <ButtonAnchor href={whatsappHref(site.whatsapp)} target="_blank" rel="noreferrer" variant="whatsappSolid" className="mt-4">
                <WhatsAppIcon size={18} />
                {t("Message us on WhatsApp")}
              </ButtonAnchor>
            </TrackClick>
          </div>
          <div className="lg:hidden">
            <ReportBox />
          </div>
        </div>
      </Container>
    </>
  );
}
