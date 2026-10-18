"use client";

import { Sparkles } from "lucide-react";
import { Link } from "@/components/i18n/link";
import { Skeleton } from "@/components/ui/display";
import { usePoints } from "@/hooks/use-points";
import { useT } from "@/lib/i18n/client";

/** Points and scratch cards in one dark card on the account page; nothing when the programme is off. */
export function PointsCard() {
  const t = useT();
  const points = usePoints();
  if (points.status === "none") return null;
  if (points.status === "loading") return <Skeleton className="h-[148px] rounded-2xl" />;
  return (
    <Link href="/rewards" className="block rounded-2xl bg-ink p-5 text-white transition-opacity hover:opacity-95">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-sm text-white/70">{points.label}</span>
        {points.cards > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-caption font-semibold">
            <Sparkles size={13} aria-hidden />
            {t("{count} to scratch", { count: points.cards })}
          </span>
        )}
      </div>
      <p className="mt-1 text-page leading-tight font-semibold">{points.balance.toLocaleString("en-IN")}</p>
      <p className="mt-3 text-body-sm font-semibold text-white/90">{t("Open rewards")} →</p>
    </Link>
  );
}
