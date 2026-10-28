import type { Metadata } from "next";
import { LegalPage } from "@/components/pages/legal-page";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return pageMetadata({
    title: t("Privacy policy"),
    description: t("What Rajkot Offers Hub collects, why, who sees it and how to delete it."),
    path: "/privacy",
  });
}

const email = <a href={`mailto:${site.email}`} className="font-medium text-primary hover:underline">{site.email}</a>;

export default async function PrivacyPage() {
  const t = await getT();
  return (
    <LegalPage
      title={t("Privacy policy")}
      updated="14 October 2026"
      intro={
        <p>
          {site.name} lists offers from local businesses in Rajkot. This policy explains what personal data we
          collect when you use the website, why, who can see it, and how you can see, correct or delete it, in line with India&apos;s
          Digital Personal Data Protection Act, 2023. You can browse offers without an account.
        </p>
      }
      sections={[
        {
          title: "What we collect",
          body: (
            <>
              <p>When you log in or use your account:</p>
              <ul>
                <li>your mobile number, to send you a one-time login code on WhatsApp and to identify your account;</li>
                <li>your MPIN, stored only in a scrambled (hashed) form that nobody can read back;</li>
                <li>your name, if you add one;</li>
                <li>the personal offer codes you claim, and whether a shop has redeemed them;</li>
                <li>the shops whose phone and WhatsApp numbers you choose to see.</li>
              </ul>
              <p>When you use the website, with or without an account:</p>
              <ul>
                <li>your IP address and basic browser details, which our servers use for security and to stop abuse;</li>
                <li>
                  what you do with an offer (opening it, tapping call, WhatsApp, directions, share or show code), counted so a
                  shop can see how its offers are doing. For visitors who are not logged in we use a scrambled form of the IP
                  address that is kept for one day only to avoid counting the same visit twice.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Location",
          body: (
            <p>
              &quot;Near me&quot; only uses your location when you tap &quot;Offers near me&quot;. We round it to about
              100 metres, keep it in a cookie in your own browser, and send it with offer lists only to sort them by distance. It is
              not saved to your account. You can remove it any time with &quot;Clear&quot; in the location menu.
            </p>
          ),
        },
        {
          title: "Cookies and storage on your device",
          body: (
            <ul>
              <li>login cookies that keep you signed in (removed when you log out), and, while you are signed in, a cookie with your account&apos;s anonymous ID for our usage statistics;</li>
              <li>a cookie with your rounded location, only if you set one;</li>
              <li>your language choice;</li>
              <li>the offers you save, kept only in your browser.</li>
            </ul>
          ),
        },
        {
          title: "Why we use it",
          body: (
            <ul>
              <li>to log you in and keep your account secure;</li>
              <li>to show offers, distances, shop contact details and your codes;</li>
              <li>to give shops counts of how their offers are used;</li>
              <li>
                to understand how the website is used (pages visited, searches, taps) so we can improve it. This runs on our own
                server, without advertising or third-party trackers, and does not record your mobile number, name or what you type
                in search. It is skipped if your browser sends Do Not Track or Global Privacy Control;
              </li>
              <li>to prevent spam, fraud and misuse, and to meet legal requirements.</li>
            </ul>
          ),
        },
        {
          title: "Who can see it",
          body: (
            <>
              <ul>
                <li>
                  <strong>Shops.</strong> When you choose to see a shop&apos;s phone or WhatsApp number, that shop can see your name
                  and when you looked. When you show a personal code, the shop sees your name. Shops never see your mobile number
                  through us, and they see offer views and taps only as counts, not who made them.
                </li>
                <li>
                  <strong>Service providers</strong> who run parts of the service for us: Meta (WhatsApp) to deliver login codes,
                  and our hosting and cloud providers. They may use the data only to provide that service.
                </li>
                <li>
                  <strong>Authorities</strong>, when the law requires it.
                </li>
              </ul>
              <p>We do not sell your personal data and we do not use advertising trackers.</p>
            </>
          ),
        },
        {
          title: "How long we keep it",
          body: (
            <p>
              We keep your account data while your account is open. When you delete your account it is first kept for a limited
              period so that our support team can restore it if you ask, and is then removed or anonymised, except for records the
              law requires us to keep.
            </p>
          ),
        },
        {
          title: "Your rights",
          body: (
            <>
              <p>You can:</p>
              <ul>
                <li>see and correct your details on the My account page;</li>
                <li>delete your account yourself from the My account page;</li>
                <li>ask us for a summary of the personal data we hold about you, or to correct or erase it;</li>
                <li>withdraw your consent at any time by deleting your account (this does not affect what was done before);</li>
                <li>nominate someone to exercise these rights for you;</li>
                <li>raise a grievance with us, and then with the Data Protection Board of India if it is not resolved.</li>
              </ul>
              <p>Write to our Grievance Officer at {email}. We will reply as soon as we can, and within the time the law allows.</p>
            </>
          ),
        },
        {
          title: "Children",
          body: <p>The website is meant for adults. If you are under 18, please use it only with a parent or guardian&apos;s consent.</p>,
        },
        {
          title: "Security",
          body: (
            <p>
              Data travels over encrypted connections, MPINs are hashed, and login cookies cannot be read by scripts on the page. No
              system is perfectly secure, so please keep your MPIN to yourself.
            </p>
          ),
        },
        {
          title: "Changes and contact",
          body: (
            <p>
              We will update this page when our practices change and show the new date at the top. Questions about privacy: {email}.
            </p>
          ),
        },
      ]}
    />
  );
}
