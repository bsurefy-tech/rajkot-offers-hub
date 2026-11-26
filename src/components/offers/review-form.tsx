"use client";

import { CircleCheck, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { submitReviewAction, type ReviewTarget } from "@/lib/actions/reviews";
import { track } from "@/lib/analytics/client";
import { useT } from "@/lib/i18n/client";
import type { ReviewCriterion } from "@/types";

/** One criterion's row: its name and five stars to tap. */
function StarRow({ criterion, value, onChange }: { criterion: ReviewCriterion; value: number; onChange: (stars: number) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={criterion.label} className="flex items-center justify-between gap-3">
      <span className="text-body">{criterion.label}</span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((stars) => (
          <button
            key={stars}
            type="button"
            role="radio"
            aria-checked={value === stars}
            aria-label={t("{rating} out of 5", { rating: stars })}
            onClick={() => onChange(stars)}
            className="flex size-10 cursor-pointer items-center justify-center"
          >
            <Star size={26} aria-hidden className={stars <= value ? "fill-amber-400 text-amber-400" : "text-line-strong"} />
          </button>
        ))}
      </span>
    </div>
  );
}

/**
 * Review a shop or an offer: an optional title and text, then one row of stars per criterion (at least one rated).
 * Anyone can fill it in; a guest is asked to log in when they submit, and the
 * review is sent as soon as they have.
 */
export function ReviewForm({ target, id, criteria, first }: { target: ReviewTarget; id: string; criteria: ReviewCriterion[]; first: boolean }) {
  const t = useT();
  const login = useLogin();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);

  if (!criteria.length) return null;
  const rated = Object.keys(ratings).length > 0;

  async function send(retry: boolean) {
    setBusy(true);
    setError(undefined);
    const result = await submitReviewAction(target, id, { ratings, title, body });
    setBusy(false);
    track("review_submit", { kind: target, result: result === "signed-out" ? "login" : result });
    // The sign-in hint was stale (the session ended): log in once more, then send.
    if (result === "signed-out" && retry) return login.prompt("write_review", () => void send(false));
    if (result === "ok") setSent(true);
    else if (result === "duplicate") setError(t("You have already reviewed this."));
    else if (result === "own") setError(t("You can't review your own shop."));
    else setError(t("Could not send. Please try again."));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!rated) return setError(t("Tap the stars to give a rating."));
    if (login.signedIn()) void send(true);
    else login.prompt("write_review", () => void send(false));
  }

  if (sent) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-surface p-4">
        <CircleCheck size={22} aria-hidden className="mt-0.5 shrink-0 text-open" />
        <div>
          <p className="text-body font-semibold">{t("Thanks for your review")}</p>
          <p className="mt-0.5 text-body-sm text-muted">{t("It is live now and helps others choose.")}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line p-4 lg:p-5">
      <p className="text-title font-semibold">{t(target === "shop" ? "Rate this shop" : "Rate this offer")}</p>
      <p className="mt-0.5 text-body-sm text-muted">{first ? t("No reviews yet. Be the first to share how it went.") : t("Tell others how it went.")}</p>
      <div className="mt-4 flex flex-col gap-4">
        <Field id={`review-title-${id}`} label={t("Title")} optional>
          <Input id={`review-title-${id}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={150} />
        </Field>
        <Field id={`review-body-${id}`} label={t("Your review")} optional>
          <Textarea id={`review-body-${id}`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={4} />
        </Field>
        <div className="flex flex-col">
          {criteria.map((criterion) => (
            <StarRow
              key={criterion.key}
              criterion={criterion}
              value={ratings[criterion.key] ?? 0}
              onChange={(stars) => {
                setRatings((current) => ({ ...current, [criterion.key]: stars }));
                setError(undefined);
              }}
            />
          ))}
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" block disabled={busy}>
          {t("Submit review")}
        </Button>
      </div>
    </form>
  );
}
