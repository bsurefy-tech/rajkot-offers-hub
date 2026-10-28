"use client";

import { track } from "@/lib/analytics/client";
import { Check, Clock, Copy, Gift, Link2, QrCode, Share2, Store, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Sheet, SheetFooter } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { applyReferralAction, saveSocialHandleAction, submitTaskAction } from "@/lib/actions/rewards";
import type { LoyaltyReferral, LoyaltyTask } from "@/lib/api/types";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";

const STEPS = [
  { icon: Store, title: "Pay at a partner shop", hint: "Look for the Rajkot Offers Hub sign at the counter." },
  { icon: QrCode, title: "Show your code", hint: "The cashier scans it along with your bill." },
  { icon: Gift, title: "Points are added", hint: "Bigger bills can also give you a scratch card." },
] as const satisfies readonly { icon: unknown; title: MessageKey; hint: MessageKey }[];

const STATUS: Record<NonNullable<LoyaltyTask["status"]>, MessageKey> = {
  submitted: "Being checked",
  waiting: "Being checked",
  approved: "Done",
  rejected: "Not accepted",
};

/** How points are earned: at a partner counter, by small tasks, and by inviting friends. */
export function EarnTab({ tasks, referral, onChanged }: { tasks: LoyaltyTask[]; referral: LoyaltyReferral | null; onChanged: () => void }) {
  const t = useT();
  const [task, setTask] = useState<LoyaltyTask | null>(null);
  return (
    <div className="flex flex-col gap-6">
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

      {tasks.length > 0 && (
        <section>
          <h2 className="mb-3 text-title font-semibold">{t("Quick tasks")}</h2>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {tasks.map((item) => {
              // The API holds a task back until the shopper's profile is saved; the sheet asks for it first.
              const startable = item.can_submit || (item.needs_profile && !item.has_profile && item.status !== "submitted" && item.earned_count === 0);
              return (
                <li key={item.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium">{item.title}</p>
                    {item.description && <p className="text-body-sm text-muted">{item.description}</p>}
                    {item.status === "rejected" && item.reject_reason && <p className="mt-1 text-body-sm text-danger">{item.reject_reason}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge variant="offer" size="xs">
                      {t("+{points} pts", { points: item.points })}
                    </Badge>
                    {item.status === "submitted" || (item.status === "approved" && !startable) ? (
                      <span className="flex items-center gap-1 text-caption font-medium text-muted">
                        {item.status === "approved" ? <Check size={13} aria-hidden /> : <Clock size={13} aria-hidden />}
                        {t(STATUS[item.status])}
                      </span>
                    ) : (
                      startable && (
                        <Button size="sm" variant="outline" className="h-8 px-3 text-body-sm" onClick={() => setTask(item)}>
                          {item.status === "rejected" ? t("Try again") : t("Send proof")}
                        </Button>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {referral?.enabled && <ReferralCard referral={referral} onChanged={onChanged} />}

      <TaskSheet key={task?.id} task={task} onClose={() => setTask(null)} onDone={onChanged} />
    </div>
  );
}

function TaskSheet({ task, onClose, onDone }: { task: LoyaltyTask | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const needsProfile = Boolean(task?.needs_profile && !task.has_profile);

  function submit(form: FormData) {
    if (!task) return;
    setError(null);
    start(async () => {
      const profile = String(form.get("profile") ?? "").trim();
      if (needsProfile && task.provider) {
        const saved = await saveSocialHandleAction(task.provider, profile);
        if (!saved.ok) return setError(saved.detail ?? t(saved.error === "login" ? "Log in again to continue." : saved.error));
      }
      const done = await submitTaskAction(task.id, form);
      track("task_submit", { type: task.type, provider: task.provider ?? "", result: done.ok ? "ok" : "error" });
      if (!done.ok) return setError(done.detail ?? t(done.error === "login" ? "Log in again to continue." : done.error));
      toast(t("Sent. We'll check it and add your points."));
      onDone();
      onClose();
    });
  }

  return (
    <Sheet open={Boolean(task)} onClose={onClose} title={task?.title ?? ""}>
      {task && (
        <form id="task-form" action={submit} className="flex flex-col gap-4">
          {task.description && <p className="text-body-sm text-muted">{task.description}</p>}
          {task.target_url && (
            <a href={task.target_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-body font-semibold text-primary">
              <Link2 size={16} aria-hidden />
              {task.target_handle ?? t("Open the page")}
            </a>
          )}
          {needsProfile && (
            <Field id="profile" label={t("Your profile link or username")}>
              <Input id="profile" name="profile" required maxLength={300} autoComplete="off" />
            </Field>
          )}
          <Field id="proof" label={t("Screenshot")} helper={t("A JPG, PNG or WebP picture, up to 10 MB.")}>
            <Input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required className="h-auto py-2.5" />
          </Field>
          <Field id="note" label={t("Note")} optional>
            <Textarea id="note" name="note" rows={2} maxLength={500} />
          </Field>
          {error && (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          )}
          <SheetFooter>
            <Button type="submit" form="task-form" block disabled={pending}>
              {pending ? t("Sending…") : t("Send for checking")}
            </Button>
          </SheetFooter>
        </form>
      )}
    </Sheet>
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
