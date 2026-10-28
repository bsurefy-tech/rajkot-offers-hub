import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { InviteView } from "@/components/rewards/invite-view";
import { api, ApiError } from "@/lib/api/client";
import type { LoyaltyInvite } from "@/lib/api/types";
import { visitorIp } from "@/lib/api/visitor";
import { getT } from "@/lib/i18n/server";
import { loyaltyEnabled } from "@/lib/rewards/enabled";

/** The shape of an invite code; whether it exists is asked of the API. */
const CODE = /^[A-Z0-9]{3,32}$/;

/**
 * Whose invite this is, before anyone logs in. "invalid" only when the API says the code is not one;
 * anything else it cannot answer (an older API, a limit, an outage) is null, and the page carries on
 * without the name: applying the code still checks it.
 */
async function lookUp(code: string): Promise<LoyaltyInvite | "invalid" | null> {
  try {
    return (await api<{ data: LoyaltyInvite }>(`/loyalty/invites/${code}`, { client: await visitorIp() })).data;
  } catch (error) {
    if (error instanceof ApiError && error.code === "REFERRAL_CODE_INVALID") return "invalid";
    if (!(error instanceof ApiError && error.status < 500)) console.error("[invite] lookup failed", error);
    return null;
  }
}

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
  const invite = await lookUp(code);
  return (
    <Container className="flex max-w-xl flex-col pt-6 pb-10 lg:pt-12 lg:pb-20">
      <InviteView code={code} invite={invite} />
    </Container>
  );
}
