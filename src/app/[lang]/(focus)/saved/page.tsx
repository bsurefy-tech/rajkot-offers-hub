import type { Metadata } from "next";
import { Suspense } from "react";
import { SubScreen } from "@/components/layout/sub-screen";
import { SavedItems } from "@/components/offers/saved-items";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Saved"),
    robots: { index: false },
  };
}

const TABS = ["offers", "shops", "following"] as const;

/** `/saved?tab=following` opens the Following tab (the account page links there). */
async function Items({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  const initial = TABS.find((name) => name === tab);
  return <SavedItems initialTab={initial} />;
}

export default async function SavedPage({ searchParams }: PageProps<"/[lang]/saved">) {
  const t = await getT();
  return (
    <SubScreen title={t("Saved")} subtitle={t("Offers and shops you like will be kept here.")}>
      <Suspense>
        <Items searchParams={searchParams} />
      </Suspense>
    </SubScreen>
  );
}
