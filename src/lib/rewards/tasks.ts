import type { LoyaltyTask, LoyaltyTaskSummary, LoyaltyTaskType } from "@/lib/api/types";

/**
 * The task list, worked out from the tasks themselves. An API from before the task list sends no `kind`,
 * `goal` or summary; everything here falls back to how tasks worked then (one screenshot, paid on approval).
 */

const AUTO_TYPES = new Set<LoyaltyTaskType>(["save_offer", "follow_shop", "claim_offer", "use_offer", "write_review", "complete_profile"]);

/** Where to go to do an in-app task when the task names no `action_url` of its own. */
const ACTION_PATHS: Partial<Record<LoyaltyTaskType, string>> = {
  save_offer: "/offers",
  follow_shop: "/businesses",
  claim_offer: "/offers",
  use_offer: "/account/codes",
  write_review: "/businesses",
  complete_profile: "/account",
};

export function isAuto(task: LoyaltyTask) {
  return (task.kind ?? (AUTO_TYPES.has(task.type) ? "auto" : "proof")) === "auto";
}

export function goalOf(task: LoyaltyTask) {
  return Math.max(1, task.goal ?? 1);
}

/** How far along it is, from 0 to the goal. A task already paid counts as all the way. */
export function progressOf(task: LoyaltyTask) {
  if (task.earned_count > 0 && !task.can_submit) return goalOf(task);
  return Math.min(goalOf(task), Math.max(0, task.progress ?? 0));
}

/** Paid at least once. A repeatable task can be done and still be open. */
export function isDone(task: LoyaltyTask) {
  return task.earned_count > 0;
}

/** Handed in or raised, and not decided yet. */
export function isInReview(task: LoyaltyTask) {
  return task.status === "submitted" || task.status === "waiting";
}

/** An in-app path that does the task, or null for a task done somewhere else (a screenshot task). */
export function actionPath(task: LoyaltyTask): string | null {
  const path = task.action_url ?? ACTION_PATHS[task.type] ?? null;
  // Only paths on this site: a task's link elsewhere is its `target_url`.
  return path && path.startsWith("/") && !path.startsWith("//") ? path : null;
}

/** The API's summary when it sends one; otherwise the part of it that the tasks can tell. */
export function summarise(tasks: LoyaltyTask[], summary: LoyaltyTaskSummary | undefined): LoyaltyTaskSummary {
  if (summary) return summary;
  return {
    total: tasks.length,
    done: tasks.filter(isDone).length,
    in_review: tasks.filter(isInReview).length,
    points_from_tasks: tasks.reduce((sum, task) => sum + (task.points_awarded ?? task.points) * task.earned_count, 0),
    streak_weeks: null,
    next_milestone: null,
  };
}
