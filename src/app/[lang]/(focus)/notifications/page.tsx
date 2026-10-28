import type { Metadata } from "next";
import { SubScreen } from "@/components/layout/sub-screen";
import { NotificationList } from "@/components/layout/notification-list";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Notifications"),
    robots: { index: false },
  };
}

export default async function NotificationsPage() {
  const t = await getT();
  return (
    <SubScreen title={t("Notifications")} subtitle={t("New offers from your shops, and your points and rewards.")} className="max-w-3xl">
      <NotificationList />
    </SubScreen>
  );
}
