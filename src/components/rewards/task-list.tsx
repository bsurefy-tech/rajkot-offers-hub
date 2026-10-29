"use client";

import { Bookmark, Camera, Check, ChevronRight, Clock, Heart, type LucideIcon, Star, Store, Ticket, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AccordionItem } from "@/components/ui/accordion";
import { Button, ButtonLink } from "@/components/ui/button";
import type { LoyaltyTask, LoyaltyTaskType } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { useLocale, useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { actionPath, canStart, goalOf, isAuto, isInReview, progressOf, sortTasks } from "@/lib/rewards/tasks";
import { Bar } from "./task-progress";

const ICONS: Partial<Record<LoyaltyTaskType, LucideIcon>> = {
  save_offer: Bookmark,
  follow_shop: Heart,
  claim_offer: Ticket,
  use_offer: Store,
  write_review: Star,
  complete_profile: UserRound,
};

const GROUPS: Record<string, MessageKey> = {
  get_started: "Get started",
  explore: "Explore",
  social: "Social",
};

/**
 * The tasks as a checklist: what is left to do (by section), what is being checked, and what is finished.
 * `onOpen` shows one task in full; `onGo` is told when the shopper leaves to do an in-app task.
 */
export function TaskList({ tasks, onOpen, onGo }: { tasks: LoyaltyTask[]; onOpen: (task: LoyaltyTask) => void; onGo?: (task: LoyaltyTask) => void }) {
  const t = useT();
  const { todo, review, completed } = sortTasks(tasks);
  // Sections only help when the API sorts tasks into more than one.
  const grouped = new Set(todo.map((task) => task.group ?? "")).size > 1;
  const sections = grouped ? [...new Set(todo.map((task) => task.group ?? ""))] : [null];
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {todo.length > 0 && (
        <section>
          <h2 className="mb-3 text-title font-semibold">{t("To do")}</h2>
          <div className="flex flex-col gap-4">
            {sections.map((group) => (
              <div key={group ?? "all"}>
                {group !== null && <h3 className="mb-2 text-caption font-semibold tracking-wide text-muted uppercase">{t(GROUPS[group] ?? "More tasks")}</h3>}
                <Rows tasks={group === null ? todo : todo.filter((task) => (task.group ?? "") === group)} onOpen={onOpen} onGo={onGo} />
              </div>
            ))}
          </div>
        </section>
      )}

      {review.length > 0 && (
        <section>
          <h2 className="mb-3 text-title font-semibold">{t("Being checked")}</h2>
          <Rows tasks={review} onOpen={onOpen} onGo={onGo} />
        </section>
      )}

      {completed.length > 0 && (
        <AccordionItem variant="card" className="bg-white" title={t("Completed ({count})", { count: completed.length })}>
          <Rows tasks={completed} onOpen={onOpen} onGo={onGo} flush />
        </AccordionItem>
      )}
    </div>
  );
}

function Rows({ tasks, onOpen, onGo, flush }: { tasks: LoyaltyTask[]; onOpen: (task: LoyaltyTask) => void; onGo?: (task: LoyaltyTask) => void; flush?: boolean }) {
  return (
    <ul className={flush ? "-mx-[18px] -mb-[18px] flex flex-col divide-y divide-line border-t border-line" : "flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white"}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onOpen={onOpen} onGo={onGo} />
      ))}
    </ul>
  );
}

function TaskRow({ task, onOpen, onGo }: { task: LoyaltyTask; onOpen: (task: LoyaltyTask) => void; onGo?: (task: LoyaltyTask) => void }) {
  const t = useT();
  const locale = useLocale();
  const auto = isAuto(task);
  const Icon = ICONS[task.type] ?? Camera;
  const goal = goalOf(task);
  const progress = progressOf(task);
  const path = actionPath(task);
  const done = task.earned_count > 0;
  const finished = done && !canStart(task) && !isInReview(task);

  return (
    <li className="flex items-center gap-3 p-4">
      <span className={finished ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success" : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"}>
        {finished ? <Check size={20} aria-hidden /> : <Icon size={20} aria-hidden />}
      </span>
      <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 cursor-pointer text-left">
        <p className="flex items-center gap-1 text-body font-medium">
          <span className="min-w-0">{task.title}</span>
          <ChevronRight size={16} aria-hidden className="shrink-0 text-faint" />
        </p>
        {task.description && !finished && <p className="line-clamp-2 text-body-sm text-muted">{task.description}</p>}
        {auto && goal > 1 && !finished && (
          <div className="mt-2 flex items-center gap-2">
            <Bar value={progress} max={goal} label={task.title} className="h-1.5 max-w-32 flex-1" />
            <span className="text-caption font-medium text-muted">{t("{done} of {total}", { done: progress, total: goal })}</span>
          </div>
        )}
        {task.status === "rejected" && task.reject_reason && <p className="mt-1 text-body-sm text-danger">{task.reject_reason}</p>}
        {finished && task.completed_at && <p className="text-body-sm text-muted">{t("Done on {date}", { date: formatShortDate(task.completed_at.slice(0, 10), locale) })}</p>}
        {done && !finished && task.earned_count > 1 && <p className="text-caption text-muted">{t("Done {count}×", { count: task.earned_count })}</p>}
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <Badge variant={finished ? "neutral" : "offer"} size="xs">
          {t("+{points} pts", { points: finished ? (task.points_awarded ?? task.points) : task.points })}
        </Badge>
        {isInReview(task) ? (
          <span className="flex items-center gap-1 text-caption font-medium text-muted">
            <Clock size={13} aria-hidden />
            {t("Being checked")}
          </span>
        ) : finished ? (
          <span className="flex items-center gap-1 text-caption font-medium text-success">
            <Check size={13} aria-hidden />
            {t("Done")}
          </span>
        ) : auto ? (
          path && (
            <ButtonLink href={path} size="sm" variant="outline" className="h-8 px-3 text-body-sm" onClick={() => onGo?.(task)}>
              {t("Go")}
            </ButtonLink>
          )
        ) : (
          canStart(task) && (
            <Button size="sm" variant="outline" className="h-8 px-3 text-body-sm" onClick={() => onOpen(task)}>
              {task.status === "rejected" ? t("Try again") : t("Send proof")}
            </Button>
          )
        )}
      </div>
    </li>
  );
}
