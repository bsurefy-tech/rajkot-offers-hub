"use client";

import { Check, Copy, Ticket } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState, useTransition } from "react";
import { useLogin } from "@/components/auth/login-dialog";
import { Link } from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import { claimCodeAction, revealCodeAction, type CodeResult } from "@/lib/actions/offers";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatShortDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";
import type { RedemptionMode } from "@/types";

type Shown = Extract<CodeResult, { ok: true }>;

/**
 * The code for an offer that has one: a shop-wide code anyone can see, or a personal one-time code
 * a logged-in shopper claims with a QR the shop scans. Either way the button reads "Claim my code".
 * Walk-in offers have neither.
 */
export function OfferCode({
  offerId,
  mode,
  compact,
  className,
}: {
  offerId: string;
  mode: RedemptionMode;
  /** For the phone's bottom bar: a tighter card that scrolls once the code is shown. */
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const login = useLogin();
  const [shown, setShown] = useState<Shown | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [pending, start] = useTransition();

  if (mode === "walk_in") return null;
  const claim = mode === "unique_claim";

  function fetchCode() {
    setError(null);
    start(async () => {
      const result = await (claim ? claimCodeAction(offerId) : revealCodeAction(offerId));
      if (result.ok) setShown(result);
      else if (result.error === "login") login.prompt(fetchCode);
      else setError(result.error);
    });
  }

  function get() {
    if (login.signedIn()) fetchCode();
    else login.prompt(fetchCode);
  }

  // In the phone's bottom bar the button stands alone; the card and its text come once there is a code to show.
  const bare = compact && !shown && !error;

  return (
    <div
      className={cn(
        !bare && "flex flex-col gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-4",
        compact && !bare && "max-h-[55dvh] overflow-y-auto p-3",
        className,
      )}
    >
      {shown ? (
        <>
          <p className="text-body-sm text-muted">{claim ? t("Your personal code. Show it at the store.") : t("Show this code at the store.")}</p>
          <CodeBox code={shown.code} />
          {claim && shown.qrPayload && <Qr payload={shown.qrPayload} />}
          {claim && shown.expiresAt && (
            <p className="text-caption text-muted">{t("Use it by {date}.", { date: formatShortDate(shown.expiresAt.slice(0, 10), locale) })}</p>
          )}
          {claim && (
            <Link href="/account/codes" className="text-body font-medium text-primary hover:underline">
              {t("See all my codes")}
            </Link>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {!compact && (
            <p className="flex min-w-0 flex-1 items-center gap-2 text-body font-medium">
              <Ticket size={18} className="shrink-0 text-primary" aria-hidden />
              {claim ? t("This offer needs a personal code. Log in to claim yours.") : t("This offer has a code to show at the store.")}
            </p>
          )}
          <Button type="button" onClick={get} disabled={pending} block>
            {t("Claim my code")}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-body text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}

function CodeBox({ code }: { code: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
      <span className="font-mono text-2xl font-semibold tracking-[0.2em]">{code}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
        className="inline-flex cursor-pointer items-center gap-1 text-body-sm font-medium text-muted hover:text-ink"
      >
        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {copied ? t("Copied") : t("Copy")}
      </button>
    </div>
  );
}

export function Qr({ payload, size = 176 }: { payload: string; size?: number }) {
  const t = useT();
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((markup) => live && setSvg(markup));
    return () => {
      live = false;
    };
  }, [payload]);
  return (
    <div
      role="img"
      aria-label={t("QR code for the store to scan")}
      className="self-center rounded-xl bg-white p-2"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
