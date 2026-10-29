"use client";

import { Clock, Flame, Gift } from "lucide-react";
import type { LoyaltyTaskSummary } from "@/lib/api/types";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** How far the shopper is through the task list: done out of total, what it has paid, the streak, and the next bonus. */
export function TaskProgress({ summary }: { summary: LoyaltyTaskSummary }) {
  const t = useT();
  const milestone = summary.next_milestone;
  const streak = summary.streak_weeks ?? 0;
  if (summary.total === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold">{t("Your tasks")}</h2>
        <p className="text-body-sm font-medium text-muted">{t("{done} of {total} done", { done: summary.done, total: summary.total })}</p>
      </div>
      <Bar value={summary.done} max={summary.total} label={t("Tasks done")} className="mt-3" />

      <ul className="mt-4 flex flex-wrap gap-2">
        <Stat>
          {t("{points} pts from tasks", { points: summary.points_from_tasks.toLocaleString("en-IN") })}
        </Stat>
        {summary.in_review > 0 && (
          <Stat>
            <Clock size={13} aria-hidden />
            {t("{count} being checked", { count: summary.in_review })}
          </Stat>
        )}
        {streak > 0 && (
          <Stat className="bg-primary-soft text-primary">
            <Flame size={13} aria-hidden />
            {streak === 1 ? t("Done a task this week") : t("{weeks}-week streak", { weeks: streak })}
          </Stat>
        )}
      </ul>

      {milestone && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Gift size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold">{milestone.title}</p>
            <p className="text-caption text-muted">
              {t("{count} more to unlock {reward}", { count: Math.max(0, milestone.needed - milestone.done), reward: milestone.reward })}
            </p>
            <Bar value={milestone.done} max={milestone.needed} label={milestone.title} className="mt-2 h-1.5" />
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ className, children }: { className?: string; children: React.ReactNode }) {
  return <li className={cn("inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-caption font-medium text-ink", className)}>{children}</li>;
}

/** A thin progress bar. Also used for one task's "1 of 3". */
export function Bar({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const share = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 overflow-hidden rounded-full bg-line", className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
    </div>
  );
}
