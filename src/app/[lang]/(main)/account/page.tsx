import { LogOut, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActivityGroup, DeleteRow, NotificationsGroup, ProfileCard, SecurityGroup } from "@/components/account/account-rows";
import { PointsCard } from "@/components/account/points-card";
import { SettingsButton, SettingsGroup } from "@/components/account/settings-row";
import { Container } from "@/components/layout/container";
import { AccountSkeleton } from "@/components/layout/page-skeleton";
import { logoutAction } from "@/lib/actions/auth";
import { getSession } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { loyaltyEnabled } from "@/lib/rewards/enabled";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("My account"), robots: { index: false, follow: false } };
}

async function Account() {
  const [t, session] = await Promise.all([getT(), getSession()]);
  if (session.status !== "signed-in") redirect("/login?next=/account");
  const { user } = session;
  const rewards = loyaltyEnabled();
  const mobile = user.phone_number ? `${user.country_code ?? ""} ${user.phone_number}`.trim() : null;
  return (
    <div className="flex flex-col gap-6">
      <ProfileCard name={user.name} mobile={mobile} email={user.email} />
      {rewards && <PointsCard />}
      <ActivityGroup rewards={rewards} />
      <NotificationsGroup />
      <SecurityGroup />
      <SettingsGroup title={t("Account")}>
        <form action={logoutAction.bind(null, false)}>
          <SettingsButton type="submit" icon={LogOut} tone="danger" arrow={false} title={t("Log out")} hint={t("Of Rajkot Offers Hub on this phone")} />
        </form>
        <form action={logoutAction.bind(null, true)}>
          <SettingsButton type="submit" icon={Smartphone} tone="danger" arrow={false} title={t("Log out on all devices")} hint={t("Anyone using your account elsewhere is logged out")} />
        </form>
        <DeleteRow />
      </SettingsGroup>
    </div>
  );
}

export default async function AccountPage() {
  const t = await getT();
  return (
    <Container className="max-w-3xl py-6 lg:py-14">
      <h1 className="mb-5 text-page font-semibold lg:mb-6">{t("My account")}</h1>
      <Suspense fallback={<AccountSkeleton rewards={loyaltyEnabled()} />}>
        <Account />
      </Suspense>
    </Container>
  );
}
