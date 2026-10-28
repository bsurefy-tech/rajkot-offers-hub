"use client";

import { track } from "@/lib/analytics/client";
import { Flag, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { reportContentAction, type ReportReason } from "@/lib/actions/zalak";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { ZalakClip, ZalakStory } from "@/lib/zalak/types";

const REASONS: { value: ReportReason; label: MessageKey }[] = [
  { value: "inappropriate", label: "Inappropriate" },
  { value: "misleading", label: "Misleading or fake" },
  { value: "spam", label: "Spam" },
  { value: "copyright", label: "Copyright" },
  { value: "other", label: "Something else" },
];

/** The "…" button in the viewer's header: report the post on screen. Only real posts can be reported, and only signed in. */
export function ReportButton({ story, clip }: { story: ZalakStory; clip: ZalakClip }) {
  const t = useT();
  const toast = useToast();
  const login = useLogin();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!story.live || !clip.id) return null;
  const id = clip.id;

  function start() {
    if (login.signedIn()) setOpen(true);
    else login.prompt("zalak_report", () => setOpen(true));
  }

  async function send(retry = true) {
    if (!reason || busy) return;
    setBusy(true);
    const result = await reportContentAction(story.kind, id, reason, note);
    setBusy(false);
    track("zalak_report", { kind: story.kind, result: result === "signed-out" ? "login" : result });
    if (result === "signed-out" && retry) return login.prompt("zalak_report", () => void send(false));
    if (result === "ok") {
      setOpen(false);
      setReason(null);
      setNote("");
      toast(t("Thanks. We will take a look."));
    } else if (result === "own") toast(t("You can't report your own post."));
    else if (result === "gone") {
      setOpen(false);
      toast(t("This post is no longer available."));
    } else if (result === "limit") toast(t("Too many reports for now. Try again later."));
    else toast(t("Could not send. Please try again."));
  }

  return (
    <>
      <button type="button" aria-label={t("Report")} onClick={start} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/15">
        <MoreHorizontal size={24} aria-hidden />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Report this post")}
        footer={
          <Button block disabled={!reason || busy} onClick={() => void send()}>
            <Flag size={16} aria-hidden />
            {t("Send report")}
          </Button>
        }
      >
        <p className="mb-2 text-body-sm text-muted">{t("Why are you reporting it?")}</p>
        <ul role="radiogroup" aria-label={t("Why are you reporting it?")} className="flex flex-col">
          {REASONS.map((item) => {
            const selected = reason === item.value;
            return (
              <li key={item.value} className="border-b border-line last:border-0">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReason(item.value)}
                  className={cn("flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 text-left text-body", selected && "font-semibold")}
                >
                  {t(item.label)}
                  <span aria-hidden className={cn("size-5 shrink-0 rounded-full border-2 border-input", selected && "border-[6px] border-primary")} />
                </button>
              </li>
            );
          })}
        </ul>
        <label className="mt-4 block text-body font-medium" htmlFor="report-note">
          {t("Add a note (optional)")}
        </label>
        <textarea
          id="report-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-input bg-white p-3 text-field outline-none focus:border-primary"
        />
      </Sheet>
    </>
  );
}
