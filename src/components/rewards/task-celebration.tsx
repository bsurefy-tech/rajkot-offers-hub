"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/client";
import type { RewardsOverview } from "@/lib/actions/rewards";
import { useT } from "@/lib/i18n/client";
import { isDone } from "@/lib/rewards/tasks";

const KEY = "rewards:tasks-seen";

/** What this browser last saw of the task list: the tasks done, and the bonus being aimed at. */
interface Seen {
  done: string[];
  milestone: { title: string; reward: string } | null;
}

function read(): Seen | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Seen) : null;
  } catch {
    return null;
  }
}

function write(seen: Seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    // Private mode or full storage: the shopper just misses the toast.
  }
}

/**
 * Says so when a task was finished since the shopper last looked — most tick themselves off elsewhere in the app,
 * so this is where they find out — and louder when that unlocked a bonus. The first visit only takes note.
 */
export function useTaskCelebration(data: RewardsOverview) {
  const t = useT();
  const toast = useToast();

  useEffect(() => {
    const done = data.tasks.filter(isDone);
    const milestone = data.taskSummary.next_milestone;
    const before = read();
    write({ done: done.map((task) => task.id), milestone: milestone && { title: milestone.title, reward: milestone.reward } });
    if (!before) return;

    const fresh = done.filter((task) => !before.done.includes(task.id));
    if (fresh.length === 0) return;
    // The bonus being aimed at is gone or has moved on, after a task was done: it was reached.
    if (before.milestone && before.milestone.title !== milestone?.title) {
      track("milestone_seen", { title: before.milestone.title });
      toast(t("Bonus unlocked: {reward}", { reward: before.milestone.reward }));
      return;
    }
    const points = fresh.reduce((sum, task) => sum + (task.points_awarded ?? task.points), 0);
    toast(
      fresh.length === 1
        ? t("Task done: {title} · +{points} pts", { title: fresh[0].title, points })
        : t("{count} tasks done · +{points} pts", { count: fresh.length, points }),
    );
  }, [data, t, toast]);
}
