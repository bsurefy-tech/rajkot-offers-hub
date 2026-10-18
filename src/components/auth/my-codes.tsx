import { Ticket } from "lucide-react";
import { Link } from "@/components/i18n/link";
import { Qr } from "@/components/offers/offer-code";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/display";
import { api } from "@/lib/api/client";
import type { Page, PromotionClaim } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { offerPath } from "@/lib/paths";

const STATUS: Record<PromotionClaim["status"], MessageKey> = {
  claimed: "Ready to use",
  redeemed: "Used",
  cancelled: "Cancelled",
  expired: "Expired",
};

/** The personal codes this shopper has claimed, newest first; usable ones with their QR. */
export async function MyCodes({ token }: { token: string }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const { data: claims } = await api<Page<PromotionClaim>>("/promotion-claims", { token, query: { per_page: 30 } });
  return (
    <section className="rounded-2xl border border-line bg-white p-5 lg:p-6">
      {claims.length === 0 ? (
        <EmptyState
          icon={Ticket}
          size="md"
          title={t("No offer codes yet")}
          hint={t("Codes you claim on offers show up here.")}
          action={<ButtonLink href="/offers">{t("Browse offers")}</ButtonLink>}
          className="py-8"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {claims.map((claim) => (
            <li key={claim.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="flex flex-1 flex-col gap-1">
                {claim.promotion ? (
                  <Link href={offerPath({ businessSlug: claim.promotion.business.slug, urlSlug: claim.promotion.slug })} className="font-medium hover:underline">
                    {claim.promotion.title}
                  </Link>
                ) : null}
                {claim.promotion && <p className="text-body-sm text-muted">{claim.promotion.business.name}</p>}
                <p className="font-mono text-lg font-semibold tracking-[0.2em]">{claim.code}</p>
                <div className="flex flex-wrap items-center gap-2 text-caption text-muted">
                  <Badge variant={claim.status === "claimed" ? "offer" : "neutral"} size="xs">
                    {t(STATUS[claim.status])}
                  </Badge>
                  {claim.status === "claimed" && claim.expires_at && (
                    <span>{t("Use it by {date}.", { date: formatShortDate(claim.expires_at.slice(0, 10), locale) })}</span>
                  )}
                </div>
              </div>
              {claim.status === "claimed" && <Qr payload={claim.qr_payload} size={128} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
