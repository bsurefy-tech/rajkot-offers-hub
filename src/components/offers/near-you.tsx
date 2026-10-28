import { Section, SectionHeader } from "@/components/layout/container";
import { getNear } from "@/lib/data/locations";
import { getOffersPage } from "@/lib/data/offers";
import { getT } from "@/lib/i18n/server";
import { NearYouPrompt } from "./near-you-prompt";
import { OfferCarousel } from "./offer-card";

/** The nearest offers to the visitor, with distances; until they share a location, a button to do so. */
export async function NearYou() {
  const t = await getT();
  const near = await getNear();
  if (!near) {
    return (
      <Section compact>
        <SectionHeader title={t("Near you")} />
        <NearYouPrompt />
      </Section>
    );
  }
  const { items } = await getOffersPage({ near, sort: "nearest" }, 1).catch(() => ({ items: [] }));
  if (items.length === 0) return null;
  return (
    <Section compact>
      <SectionHeader title={t("Near you")} href="/offers?sort=nearest" />
      <OfferCarousel offers={items.slice(0, 8)} />
    </Section>
  );
}
