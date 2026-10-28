"use client";

import { Check, Clock, Link2, Send, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/display";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Sheet, SheetFooter } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/client";
import { saveSocialHandleAction, submitTaskAction, taskTimelineAction } from "@/lib/actions/rewards";
import type { LoyaltyTask, LoyaltyTaskCompletion } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import { actionPath, canStart, goalOf, isAuto, progressOf } from "@/lib/rewards/tasks";
import { Bar } from "./task-progress";

/**
 * One task in full: what it asks, how far along it is, every go so far and how each was decided, and — while it
 * can be done — the way to do it (the proof form, or a link to where it happens in the app).
 */
export function TaskSheet({ task, onClose, onDone }: { task: LoyaltyTask | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const auto = task ? isAuto(task) : false;
  const path = task ? actionPath(task) : null;
  const goal = task ? goalOf(task) : 1;
  const progress = task ? progressOf(task) : 0;
  const startable = task ? canStart(task) : false;

  return (
    <Sheet open={Boolean(task)} onClose={onClose} title={task?.title ?? ""}>
      {task && (
        <div className="flex flex-col gap-5">
          {task.description && <p className="text-body-sm text-muted">{task.description}</p>}

          {auto && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-body-sm font-medium">{t("Progress")}</p>
                <p className="text-body-sm text-muted">{t("{done} of {total}", { done: progress, total: goal })}</p>
              </div>
              <Bar value={progress} max={goal} label={task.title} />
              <p className="mt-2 text-caption text-muted">{t("This ticks itself off when you do it in the app. Points are added straight away.")}</p>
            </div>
          )}

          {(task.status !== null || task.earned_count > 0) && <Timeline task={task} />}

          {startable && <ProofForm task={task} onDone={onDone} onClose={onClose} />}

          {auto && path && progress < goal && (
            <SheetFooter>
              <ButtonLink href={path} block onClick={() => track("task_go", { type: task.type, from: "sheet" })}>
                {t("Go and do it")}
              </ButtonLink>
            </SheetFooter>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** Each go at the task, newest first. Loaded when the sheet opens: the task list only carries the latest. */
function Timeline({ task }: { task: LoyaltyTask }) {
  const t = useT();
  const locale = useLocale();
  const [entries, setEntries] = useState<LoyaltyTaskCompletion[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void taskTimelineAction(task.id).then((result) => {
      if (!live) return;
      if (result.status === "ok") setEntries(result.data);
      else setFailed(true);
    });
    track("task_timeline_view", { type: task.type });
    return () => {
      live = false;
    };
  }, [task.id, task.type]);

  if (failed) return null;
  if (!entries) return <Skeleton className="h-16 rounded-xl" />;
  if (entries.length === 0) return null;

  const date = (iso: string | null) => (iso ? formatShortDate(iso.slice(0, 10), locale) : "");
  return (
    <section>
      <h3 className="mb-2 text-body-sm font-semibold">{t("Your history")}</h3>
      <ol className="flex flex-col">
        {entries.map((entry, i) => {
          const last = i === entries.length - 1;
          const { icon: Icon, tone, label } = {
            submitted: { icon: Send, tone: "bg-surface text-muted", label: t("Sent, being checked") },
            waiting: { icon: Clock, tone: "bg-surface text-muted", label: t("On hold, points come soon") },
            approved: { icon: Check, tone: "bg-success-soft text-success", label: t("Done · +{points} pts", { points: entry.points_awarded ?? task.points }) },
            rejected: { icon: X, tone: "bg-danger/10 text-danger", label: t("Not accepted") },
          }[entry.status];
          return (
            <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!last && <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-line" />}
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon size={15} aria-hidden />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-body-sm font-medium">{label}</p>
                <p className="text-caption text-muted">
                  {entry.reviewed_at && entry.status !== "submitted" && entry.status !== "waiting"
                    ? t("Sent {sent} · checked {checked}", { sent: date(entry.submitted_at), checked: date(entry.reviewed_at) })
                    : t("Sent {sent}", { sent: date(entry.submitted_at) })}
                </p>
                {entry.status === "rejected" && entry.reject_reason && <p className="mt-1 text-body-sm text-danger">{entry.reject_reason}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The screenshot (and the profile, when the task needs one) that a person checks before the points arrive. */
function ProofForm({ task, onDone, onClose }: { task: LoyaltyTask; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const needsProfile = task.needs_profile && !task.has_profile;

  function submit(form: FormData) {
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
    <form id="task-form" action={submit} className="flex flex-col gap-4">
      {task.status === "rejected" && <p className="text-body-sm font-semibold">{t("Try again")}</p>}
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
  );
}
