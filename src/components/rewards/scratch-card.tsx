"use client";

import { Gift, Smile, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Qr } from "@/components/offers/offer-code";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { scratchCardAction } from "@/lib/actions/rewards";
import type { LoyaltyScratchCard } from "@/lib/api/types";
import { useLocale, useT } from "@/lib/i18n/client";
import { formatShortDate } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils";

const W = 268;
const H = 150;
/** Share of the foil that has to be gone before the rest comes off by itself. */
const CLEAR_AT = 0.4;

type Phase = "idle" | "drawing" | "failed";

/**
 * A scratch card in a sheet. The foil is a canvas the finger or mouse rubs off; the prize is drawn on the server
 * the moment scratching starts (it is the same on a repeat), so nothing about it depends on this page.
 * "Reveal for me" clears the foil without scratching, for anyone who cannot rub the screen.
 * Give it a `key` per card: a new card starts with the foil back on.
 */
export function ScratchSheet({
  card,
  onClose,
  onScratched,
}: {
  card: LoyaltyScratchCard | null;
  onClose: () => void;
  /** The card as it is once scratched, so the page can update its balance. */
  onScratched: (card: LoyaltyScratchCard) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<LoyaltyScratchCard | null>(card?.status === "scratched" ? card : null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [cleared, setCleared] = useState(card?.status === "scratched");
  const started = useRef(false);

  useEffect(() => {
    const el = canvas.current;
    if (!el || !card || cleared) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    // Sharp on a phone screen: the canvas has one pixel per device pixel, drawn in CSS pixels.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    el.width = W * dpr;
    el.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#c4ccd5";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#b3bcc6";
    ctx.lineWidth = 6;
    for (let x = -H; x < W; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + H, H);
      ctx.stroke();
    }
    ctx.fillStyle = "#5b6b7b";
    ctx.font = "600 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("Scratch here"), W / 2, H / 2 + 5);
  }, [card, cleared, t]);

  const draw = useCallback(async () => {
    if (!card || started.current) return;
    started.current = true;
    setPhase("drawing");
    const done = await scratchCardAction(card.id);
    if (done.ok) {
      setResult(done.data);
      setPhase("idle");
    } else {
      // Let the next touch try again; the foil stays on so nothing is lost.
      started.current = false;
      setError(done.error === "login" ? "Log in again to scratch this card." : (done.error as MessageKey));
      setPhase("failed");
    }
  }, [card]);

  const clear = useCallback(() => {
    setCleared(true);
  }, []);

  // Rubbing: erase a circle under the pointer; once enough is gone, the rest follows.
  const rub = useRef(false);
  function erase(e: React.PointerEvent<HTMLCanvasElement>) {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const box = el.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(((e.clientX - box.left) * W) / box.width, ((e.clientY - box.top) * H) / box.height, 17, 0, Math.PI * 2);
    ctx.fill();
  }
  function measure() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data;
    let gone = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 64) {
      total++;
      if (data[i] < 10) gone++;
    }
    if (gone / total >= CLEAR_AT) clear();
  }

  async function reveal() {
    if (!result) await draw();
    clear();
  }

  // The page's balance changes with the prize, so it is told once the sheet is closed, not behind it.
  function close() {
    if (result?.status === "scratched" && card?.status !== "scratched") onScratched(result);
    onClose();
  }

  const prize = result?.prize ?? null;
  const showPrize = cleared && prize;

  return (
    <Sheet
      open={Boolean(card)}
      onClose={close}
      title={t("Scratch card")}
      footer={
        card &&
        (cleared ? (
          <Button block onClick={close}>
            {t("Done")}
          </Button>
        ) : (
          <Button variant="outline" block onClick={reveal} disabled={phase === "drawing"}>
            {t("Reveal for me")}
          </Button>
        ))
      }
    >
      {card && (
        <div className="flex flex-col items-center gap-4 pb-1 text-center">
          <div>
            <p className="text-body-sm text-muted">{card.campaign.title}</p>
            <p className="mt-1 text-heading font-semibold">{showPrize ? (prize.kind === "nothing" ? t("Better luck next time") : t("You won")) : t("Scratch to reveal your prize")}</p>
          </div>

          <div className="relative flex h-[150px] w-[268px] touch-none items-center justify-center overflow-hidden rounded-2xl bg-primary-soft">
            {showPrize ? <Prize prize={prize} /> : <Sparkles size={38} className="text-primary/40" aria-hidden />}
            {!cleared && (
              <canvas
                ref={canvas}
                aria-label={t("Scratch card foil")}
                className="absolute inset-0 size-full cursor-grab touch-none"
                onPointerDown={(e) => {
                  rub.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  void draw();
                  erase(e);
                }}
                onPointerMove={(e) => rub.current && erase(e)}
                onPointerUp={() => {
                  rub.current = false;
                  measure();
                }}
                onPointerCancel={() => (rub.current = false)}
              />
            )}
          </div>

          {error && (
            <p role="alert" className="text-body text-danger">
              {t(error)}
            </p>
          )}

          {showPrize && prize.kind === "reward" && prize.redemption && <RewardPrize redemption={prize.redemption} />}
          {showPrize && prize.kind === "points" && <p className="text-body-sm text-muted">{t("Added to your points.")}</p>}

          {card.expires_at && !cleared && (
            <p className="text-caption text-muted">{t("Use it by {date}.", { date: formatShortDate(card.expires_at.slice(0, 10), locale) })}</p>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Prize({ prize }: { prize: NonNullable<LoyaltyScratchCard["prize"]> }) {
  const t = useT();
  const Icon = prize.kind === "reward" ? Gift : Smile;
  return (
    <div className="relative flex animate-prize-pop flex-col items-center gap-1 motion-reduce:animate-none">
      {prize.kind === "points" ? (
        <>
          <span className="text-display leading-none font-semibold text-primary">+{prize.points ?? 0}</span>
          <span className="text-title font-semibold">{t("points")}</span>
        </>
      ) : (
        <>
          <Icon size={40} className={cn(prize.kind === "reward" ? "text-primary" : "text-muted")} aria-hidden />
          <span className="max-w-56 text-title leading-snug font-semibold">{prize.label}</span>
        </>
      )}
      {prize.kind !== "nothing" && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 -top-2 flex justify-around motion-reduce:hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <Sparkles key={i} size={14} className="animate-spark-rise text-primary" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </span>
      )}
    </div>
  );
}

/** A reward prize comes as a normal reward code the shop takes at the counter. */
function RewardPrize({ redemption }: { redemption: NonNullable<NonNullable<LoyaltyScratchCard["prize"]>["redemption"]> }) {
  const t = useT();
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-line p-4">
      <p className="text-body font-semibold">{redemption.reward.title}</p>
      {redemption.qr_payload && <Qr payload={redemption.qr_payload} size={150} />}
      <p className="font-mono text-xl font-semibold tracking-[0.2em]">{redemption.code}</p>
      <p className="text-caption text-muted">{t("Show this code at a partner shop. It is saved under My reward codes.")}</p>
    </div>
  );
}
