import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MyCodes } from "@/components/auth/my-codes";
import { SubScreen } from "@/components/layout/sub-screen";
import { Skeleton } from "@/components/ui/display";
import { accessToken, getSession } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("My offer codes"), robots: { index: false, follow: false } };
}

async function Codes() {
  const session = await getSession();
  if (session.status !== "signed-in") redirect("/login?next=/account/codes");
  const token = await accessToken();
  return token ? <MyCodes token={token} /> : null;
}

export default async function OfferCodesPage() {
  const t = await getT();
  return (
    <SubScreen title={t("My offer codes")} subtitle={t("Codes you claimed on offers")} className="max-w-3xl">
      <Suspense fallback={<Skeleton className="h-40 rounded-2xl" />}>
        <Codes />
      </Suspense>
    </SubScreen>
  );
}
