"use client";

import { CircleCheck, Gift, Smartphone, Ticket } from "lucide-react";
import { useState, useTransition } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { Button, ButtonLink } from "@/components/ui/button";
import { applyReferralAction } from "@/lib/actions/rewards";
import { track } from "@/lib/analytics/client";
import { useT } from "@/lib/i18n/client";

/**
 * A friend's invite link. One tap adds their code; a visitor who is not logged in is asked to first,
 * and the code is added as soon as they are. Whether the code is valid (and they are still new enough
 * to use one) only the API can say, so its own sentence is shown when it refuses.
 */
export function InviteView({ code }: { code: string }) {
  const t = useT();
  const login = useLogin();
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apply() {
    setError(null);
    start(async () => {
      const done = await applyReferralAction(code);
      if (!done.ok && done.error === "login") {
        login.prompt("invite", apply);
        return;
      }
      track("referral_apply", { result: done.ok ? "ok" : "error", source: "link" });
      if (done.ok) setAdded(true);
      else setError(done.detail ?? t(done.error === "login" ? "Log in again to continue." : done.error));
    });
  }

  const steps = [
    { icon: Smartphone, title: t("Log in with your mobile number"), hint: t("The first time, we send you a code on WhatsApp.") },
    { icon: Ticket, title: t("Pay at a partner shop"), hint: t("Show your code at the counter with your bill.") },
    { icon: Gift, title: t("Spend them on rewards"), hint: t("Turn points into discounts and free items at local shops.") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-ink p-6 text-white">
        {added ? (
          <>
            <CircleCheck size={32} aria-hidden className="text-white" />
            <p className="mt-3 text-page leading-snug font-semibold">{t("Invite code added")}</p>
            <p className="mt-1 text-body-sm text-white/70">{t("Shop at a partner shop to start earning points.")}</p>
            <ButtonLink href="/rewards" block className="mt-5 bg-white text-ink hover:bg-white/90">
              {t("Go to Rewards")}
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="text-body-sm text-white/70">{t("A friend invited you to Rajkot Offers Hub")}</p>
            <p className="mt-1 text-page leading-snug font-semibold">{t("Join with their code and earn points every time you shop local.")}</p>
            <div className="mt-5 flex h-12 items-center justify-center rounded-xl border border-dashed border-white/40 font-mono text-lg font-semibold tracking-[0.2em]">
              {code}
            </div>
            <Button block className="mt-3 bg-white text-ink hover:bg-white/90" disabled={pending} onClick={apply}>
              {pending ? t("Adding…") : t("Use this invite")}
            </Button>
            {error && (
              <p role="alert" className="mt-3 text-body-sm text-white">
                {error}
              </p>
            )}
          </>
        )}
      </section>
      <ul className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
        {steps.map(({ icon: Icon, title, hint }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Icon size={20} aria-hidden />
            </span>
            <div>
              <p className="text-body font-medium">{title}</p>
              <p className="text-body-sm text-muted">{hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
