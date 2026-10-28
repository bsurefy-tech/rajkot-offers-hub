import type { Metadata } from "next";
import { Link } from "@/components/i18n/link";
import { LegalPage } from "@/components/pages/legal-page";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Terms of use"),
    description: t("The rules for using Rajkot Offers Hub, its offers and codes."),
    path: "/terms",
  });
}

const link = "font-medium text-primary hover:underline";

export default async function TermsPage() {
  const t = await getT();
  return (
    <LegalPage
      title={t("Terms of use")}
      updated="14 October 2026"
      intro={
        <p>
          These terms apply when you use {site.name}. By using the website you agree to them. If you do not agree,
          please do not use it. Our{" "}
          <Link href="/privacy" className={link}>
            privacy policy
          </Link>{" "}
          explains how we handle your personal data.
        </p>
      }
      sections={[
        {
          title: "What we do",
          body: (
            <p>
              We list offers that local businesses in Rajkot publish themselves. We are not the seller: the goods and services, their
              prices, quality, stock and delivery are the business&apos;s responsibility, and any purchase is between you and the
              business.
            </p>
          ),
        },
        {
          title: "Offers",
          body: (
            <>
              <p>
                Businesses write their own offers. We check shops and offers before they go live, but we cannot guarantee that every
                detail is correct or that a business will honour an offer. Stock, timings and terms can change; please confirm with
                the store before you buy.
              </p>
              <p>Each offer is subject to its own validity, timings, terms and limits, as shown on the offer page.</p>
            </>
          ),
        },
        {
          title: "Your account",
          body: (
            <ul>
              <li>Use your own mobile number and keep one account per person.</li>
              <li>Keep your MPIN secret. You are responsible for what is done with your account.</li>
              <li>You can delete your account at any time from the My account page.</li>
            </ul>
          ),
        },
        {
          title: "Offer codes",
          body: (
            <ul>
              <li>A personal code is for you only, can be used once, and expires as shown.</li>
              <li>Codes have no cash value and cannot be sold or exchanged.</li>
              <li>A business may refuse a code that is expired, already used or misused.</li>
            </ul>
          ),
        },
        {
          title: "Fair use",
          body: (
            <>
              <p>Please do not:</p>
              <ul>
                <li>copy or scrape listings, or use automated tools against the website;</li>
                <li>use shop phone numbers for spam or anything other than contacting the shop about its business;</li>
                <li>create fake accounts, claim codes you do not intend to use, or try to get around offer limits;</li>
                <li>interfere with the website, its security or other people&apos;s use of it.</li>
              </ul>
              <p>We may suspend or close accounts that break these terms.</p>
            </>
          ),
        },
        {
          title: "Businesses",
          body: (
            <p>
              Businesses list shops and offers through the BSurefy business app, under its own terms. A business must only publish
              offers it will honour and information that is true.
            </p>
          ),
        },
        {
          title: "Our content",
          body: (
            <p>
              The website&apos;s design, text and software belong to us or our licensors. Offer text and photos belong to the businesses
              that published them.
            </p>
          ),
        },
        {
          title: "Liability",
          body: (
            <p>
              The website is provided &quot;as is&quot;. As far as the law allows, we are not liable for any loss arising from an offer, a
              purchase from a business, or the website being unavailable. Nothing in these terms limits rights you have under Indian
              consumer law.
            </p>
          ),
        },
        {
          title: "Law and disputes",
          body: (
            <p>These terms are governed by the laws of India. Courts at Rajkot, Gujarat have jurisdiction over any dispute.</p>
          ),
        },
        {
          title: "Changes and contact",
          body: (
            <p>
              We may update these terms and will show the new date at the top. Questions or complaints:{" "}
              <a href={`mailto:${site.email}`} className={link}>
                {site.email}
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
