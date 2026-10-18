"use client";

import { ChevronsRight, Scissors } from "lucide-react";
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const KNOB = 40;
const INSET = 4;
/** How far along the track (0–1) a release counts as a finished cut. */
const FINISH = 0.85;
/** Movement (px) under which a press is a tap rather than a swipe. */
const TAP = 6;

/**
 * "Claim my code" as a swipe: drag the scissors left to right along the dashed line to cut the coupon.
 * A tap or Enter also completes it, so it never needs a swipe. `busy` keeps the scissors at the end while the claim is
 * in flight; once it is over without a code (login prompt, error) they spring back.
 */
export function SwipeToClaim({ onClaim, busy, className }: { onClaim: () => void; busy: boolean; className?: string }) {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLButtonElement>(null);
  const cut = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const drag = useRef<{ from: number; moved: number } | null>(null);
  const x = useRef(0);
  const locked = useRef(false);
  const busyNow = useRef(busy);

  const max = () => (track.current?.clientWidth ?? 0) - KNOB - INSET * 2;

  function move(to: number, animate: boolean) {
    const next = Math.max(0, Math.min(to, max()));
    x.current = next;
    if (knob.current) {
      knob.current.style.transition = animate ? "transform 0.22s ease-out" : "none";
      knob.current.style.transform = `translateX(${next}px)`;
    }
    if (cut.current) {
      cut.current.style.transition = animate ? "width 0.22s ease-out" : "none";
      cut.current.style.width = next ? `${next + KNOB / 2 + INSET}px` : "0px";
    }
    if (hint.current) hint.current.style.opacity = String(Math.max(0, 1 - next / 80));
  }

  function reset() {
    locked.current = false;
    move(0, true);
  }

  function finish() {
    if (locked.current) return;
    locked.current = true;
    move(max(), true);
    onClaim();
    // No claim started (the login prompt opened instead): the scissors go back so it can be tried again.
    window.setTimeout(() => {
      if (!busyNow.current) reset();
    }, 400);
  }

  // A claim that ends without a code on screen (error) also sends the scissors back.
  useEffect(() => {
    if (busyNow.current && !busy && locked.current) {
      locked.current = false;
      if (knob.current) knob.current.style.transition = "transform 0.22s ease-out";
      move(0, true);
    }
    busyNow.current = busy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  return (
    <div ref={track} className={cn("relative h-12 touch-pan-y overflow-hidden rounded-xl bg-primary text-white select-none", className)}>
      <div className="absolute inset-x-3 top-1/2 -translate-y-px border-t-2 border-dashed border-white/70" aria-hidden />
      <div ref={cut} className="absolute top-1/2 left-3 w-0 -translate-y-px border-t-2 border-white" aria-hidden />
      <div ref={hint} className="pointer-events-none absolute inset-0 flex items-center justify-center pl-11 text-body font-semibold">
        {/* The label has its own background so the dashed line breaks around it. */}
        <span className="flex items-center gap-1.5 bg-primary px-2">
          {t("Swipe to claim your code")}
          <ChevronsRight size={18} aria-hidden className="motion-safe:animate-swipe-nudge" />
        </span>
      </div>
      <button
        ref={knob}
        type="button"
        aria-label={t("Claim my code")}
        disabled={busy}
        onPointerDown={(e) => {
          drag.current = { from: e.clientX - x.current, moved: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          drag.current.moved = Math.max(drag.current.moved, Math.abs(e.clientX - drag.current.from - x.current));
          move(e.clientX - drag.current.from, false);
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.moved < TAP || x.current >= max() * FINISH) finish();
          else reset();
        }}
        onPointerCancel={() => {
          drag.current = null;
          reset();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            finish();
          }
        }}
        style={{ left: INSET, top: INSET, width: KNOB, height: KNOB }}
        className="group absolute z-10 flex cursor-grab touch-none items-center justify-center rounded-lg bg-white text-primary active:cursor-grabbing"
      >
        {/* Idle, the scissors peek along the line and snip; the moment they are touched they stop. */}
        <span className="flex motion-safe:animate-scissor-peek motion-safe:group-active:animate-none motion-safe:group-disabled:animate-none">
          <Scissors size={22} aria-hidden className="motion-safe:animate-scissor-snip motion-safe:group-active:animate-none motion-safe:group-disabled:animate-none" />
        </span>
      </button>
    </div>
  );
}
