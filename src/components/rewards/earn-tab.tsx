"use client";

import { track } from "@/lib/analytics/client";
import { Copy, Gift, QrCode, Share2, Store, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { applyReferralAction } from "@/lib/actions/rewards";
import type { LoyaltyReferral, LoyaltyTask, LoyaltyTaskSummary } from "@/lib/api/types";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { TaskList } from "./task-list";
import { TaskProgress } from "./task-progress";
import { TaskSheet } from "./task-sheet";

const STEPS = [
  { icon: Store, title: "Pay at a partner shop", hint: "Look for the Rajkot Offers Hub sign at the counter." },
  { icon: QrCode, title: "Show your code", hint: "The cashier scans it along with your bill." },
  { icon: Gift, title: "Points are added", hint: "Bigger bills can also give you a scratch card." },
] as const satisfies readonly { icon: unknown; title: MessageKey; hint: MessageKey }[];

/** How points are earned: at a partner counter, by small tasks, and by inviting friends. */
export function EarnTab({
  tasks,
  summary,
  referral,
  onChanged,
}: {
  tasks: LoyaltyTask[];
  summary: LoyaltyTaskSummary;
  referral: LoyaltyReferral | null;
  onChanged: () => void;
}) {
  const t = useT();
  const [task, setTask] = useState<LoyaltyTask | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <TaskProgress summary={summary} />

      <TaskList
        tasks={tasks}
        onOpen={(item) => {
          track("task_open", { type: item.type, status: item.status ?? "new" });
          setTask(item);
        }}
        onGo={(item) => track("task_go", { type: item.type, from: "list" })}
      />

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-title font-semibold">{t("How you earn points")}</h2>
        <ol className="mt-4 flex flex-col gap-4">
          {STEPS.map(({ icon: Icon, title, hint }, i) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon size={20} aria-hidden />
              </span>
              <div>
                <p className="text-body font-medium">
                  {i + 1}. {t(title)}
                </p>
                <p className="text-body-sm text-muted">{t(hint)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {referral?.enabled && <ReferralCard referral={referral} onChanged={onChanged} />}

      <TaskSheet key={task?.id} task={task} onClose={() => setTask(null)} onDone={onChanged} />
    </div>
  );
}

function ReferralCard({ referral, onChanged }: { referral: LoyaltyReferral; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const joined = referral.friends.active + referral.friends.completed + referral.friends.awaiting_verification;

  async function share() {
    const url = referral.invite_url ?? referral.code;
    const text = t("Join me on Rajkot Offers Hub and earn points at local shops. My invite code: {code}", { code: referral.code });
    if (navigator.share) {
      try {
        await navigator.share({ text, url: referral.invite_url ?? undefined });
        track("referral_share", { method: "share_sheet" });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${referral.invite_url ?? ""}`.trim());
      track("referral_share", { method: "copy" });
      toast(referral.invite_url ? t("Link copied") : t("Code copied"));
    } catch {
      toast(url);
    }
  }

  function apply(form: FormData) {
    setError(null);
    start(async () => {
      const done = await applyReferralAction(String(form.get("code") ?? ""));
      track("referral_apply", { result: done.ok ? "ok" : "error", source: "form" });
      if (!done.ok) return setError(done.detail ?? t(done.error === "login" ? "Log in again to continue." : done.error));
      toast(t("Invite code added"));
      onChanged();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Users size={20} aria-hidden />
        </span>
        <div>
          <h2 className="text-title font-semibold">{t("Invite friends")}</h2>
          <p className="text-body-sm text-muted">
            {referral.headline_points > 0
              ? t("Earn up to {points} points for each friend. You are paid as they complete each step.", { points: referral.headline_points })
              : t("Earn points as your friends complete each step.")}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="flex h-12 flex-1 items-center justify-center rounded-xl border border-dashed border-line-strong font-mono text-lg font-semibold tracking-[0.2em]">{referral.code}</div>
        <Button variant="outline" iconOnly aria-label={t("Copy code")} onClick={() => void navigator.clipboard.writeText(referral.code).then(() => toast(t("Code copied")))}>
          <Copy size={18} aria-hidden />
        </Button>
        <Button iconOnly aria-label={t("Share invite")} onClick={() => void share()}>
          <Share2 size={18} aria-hidden />
        </Button>
      </div>
      <p className="mt-3 text-body-sm text-muted">
        {t("{count} friends joined · {points} points earned", { count: joined, points: referral.earned_points })}
      </p>
      {!referral.invited_by && (
        <form action={apply} className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          <Field id="invite-code" label={t("Got a friend's invite code?")} helper={t("Add it within {days} days of joining.", { days: referral.apply_window_days })} error={error ?? undefined}>
            <div className="flex gap-2">
              <Input id="invite-code" name="code" maxLength={32} autoCapitalize="characters" autoComplete="off" required />
              <Button type="submit" variant="outline" disabled={pending}>
                {t("Add")}
              </Button>
            </div>
          </Field>
        </form>
      )}
    </section>
  );
}
