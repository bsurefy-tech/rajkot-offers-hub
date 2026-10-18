import type { Metadata } from "next";
import Image from "next/image";
import { Download, PencilLine, ShieldCheck } from "lucide-react";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons/brand";
import { ButtonAnchor } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { MobileTopBar } from "@/components/layout/header";
import { getT } from "@/lib/i18n/server";
import { img } from "@/lib/mock/images";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { TrackClick } from "@/components/analytics/track-click";
import { whatsappHref } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Submit an offer"),
    description: t("List your shop's offer for free and reach customers in Rajkot."),
    path: "/submit-offer",
  });
}

async function Intro({ large }: { large?: boolean }) {
  const t = await getT();
  return (
    <div>
      <h1 className={large ? "text-page leading-tight font-semibold" : "text-page leading-[1.3] font-semibold"}>
        {t("Take your offer to Rajkot")}
      </h1>
      <p className={large ? "mt-3 max-w-[440px] text-body text-muted" : "mt-2 text-body-sm text-muted"}>
        {t("Shop owners list and manage their offers in the Rajkot Offers business app. Our team checks every offer before it goes live.")}
      </p>
    </div>
  );
}

async function HowSteps({ large }: { large?: boolean }) {
  const t = await getT();
  const how = [
    { icon: Download, text: t("Get the business app and sign in with your mobile number") },
    { icon: PencilLine, text: t("Add your shop and your offer") },
    { icon: ShieldCheck, text: t("Our team will verify it") },
    { icon: InstagramIcon, text: t("Once approved, the offer appears on the website and Instagram") },
  ];
  return (
    <ol className="flex flex-col gap-3 lg:gap-4">
      {how.map(({ icon: Icon, text }, i) => (
        <li key={text} className="flex items-center gap-3">
          <span
            className={
              large
                ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-white"
                : "flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
            }
          >
            <Icon size={18} aria-hidden />
          </span>
          <span>
            {large && <span className="block text-caption text-faint">{t("Step {number}", { number: i + 1 })}</span>}
            <span className={large ? "text-body" : "text-body"}>{text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Where shop owners get the business app; until store links are set, WhatsApp us. */
async function GetTheApp() {
  const t = await getT();
  const { android, ios } = site.ownerApp;
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-heading font-semibold">{t("List your offer with the business app")}</h2>
      <p className="text-body-sm text-muted">{t("It is free. Add your shop once, then post new offers whenever you like and see how many people view, call and visit.")}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {android && (
          <TrackClick event="submit_offer_cta" properties={{ kind: "android" }}>
            <ButtonAnchor href={android} target="_blank" rel="noreferrer">
              <Download size={18} aria-hidden />
              {t("Get it on Google Play")}
            </ButtonAnchor>
          </TrackClick>
        )}
        {ios && (
          <TrackClick event="submit_offer_cta" properties={{ kind: "ios" }}>
            <ButtonAnchor href={ios} target="_blank" rel="noreferrer" variant={android ? "outline" : "primary"}>
              <Download size={18} aria-hidden />
              {t("Download on the App Store")}
            </ButtonAnchor>
          </TrackClick>
        )}
        <TrackClick event="submit_offer_cta" properties={{ kind: "whatsapp" }}>
          <ButtonAnchor
            href={whatsappHref(site.whatsapp, t("Hi, I want to list my shop's offer on Rajkot Offers Hub."))}
            target="_blank"
            rel="noreferrer"
            variant="whatsappSolid"
          >
            <WhatsAppIcon size={18} />
            {t("Message us on WhatsApp")}
          </ButtonAnchor>
        </TrackClick>
      </div>
    </div>
  );
}

export default async function SubmitOfferPage() {
  const t = await getT();

  return (
    <>
      <MobileTopBar title={t("Submit an offer")} backHref="/" />
      <div className="lg:bg-surface">
        <Container className="pt-5 pb-7 lg:grid lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-16 lg:pt-16 lg:pb-20">
          <div className="hidden flex-col gap-8 lg:flex">
            <Intro large />
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={img("photo-1441986300917-64674bd600d8", 900)}
                alt=""
                fill
                sizes="440px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:rounded-2xl lg:border lg:border-line lg:bg-white lg:p-10 lg:shadow-form">
            <div className="flex flex-col gap-6 lg:hidden">
              <Intro />
            </div>
            <GetTheApp />
            <div className="flex flex-col gap-4 border-t border-line pt-6">
              <h2 className="text-heading font-semibold">{t("How it works")}</h2>
              <HowSteps />
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
