import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { InviteView } from "@/components/rewards/invite-view";
import { getT } from "@/lib/i18n/server";
import { loyaltyEnabled } from "@/lib/rewards/enabled";

/** The shape of an invite code; whether it exists is only known once it is applied. */
const CODE = /^[A-Z0-9]{3,32}$/;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const title = t("You're invited");
  const description = t("Join Rajkot Offers Hub with a friend's invite and earn points at local shops.");
  return { title, description, openGraph: { title, description }, robots: { index: false, follow: false } };
}

/** Where a shared invite link lands ("/invite/<code>"): log in and the friend's code is added in one go. */
export default async function InvitePage({ params }: PageProps<"/[lang]/invite/[code]">) {
  const code = decodeURIComponent((await params).code).toUpperCase();
  if (!loyaltyEnabled() || !CODE.test(code)) notFound();
  return (
    <Container className="flex max-w-xl flex-col pt-6 pb-10 lg:pt-12 lg:pb-20">
      <InviteView code={code} />
    </Container>
  );
}
