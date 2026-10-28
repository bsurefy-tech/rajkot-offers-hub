import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageTitle } from "@/components/layout/container";
import { RewardsView } from "@/components/rewards/rewards-view";
import { getT } from "@/lib/i18n/server";
import { loyaltyEnabled } from "@/lib/rewards/enabled";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Rewards"), robots: { index: false } };
}

export default async function RewardsPage({ searchParams }: PageProps<"/[lang]/rewards">) {
  if (!loyaltyEnabled()) notFound();
  const t = await getT();
  const { tab } = await searchParams;
  return (
    <Container className="flex max-w-3xl flex-col gap-6 pt-6 pb-10 lg:gap-8 lg:pt-12 lg:pb-20">
      <PageTitle title={t("Rewards")} subtitle={t("Points, scratch cards and rewards from local shops.")} />
      <RewardsView tab={typeof tab === "string" ? tab : undefined} />
    </Container>
  );
}
