"use client";

import { ArrowLeftRight } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { markStatusSeen, markTourDone, reportSeen, ringSeenKey, useTourPending } from "@/hooks/use-zalak-memory";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { ZalakStory } from "@/lib/zalak/types";
import { ClipMedia, EmptyStage, Overlay, Scrim, Shell, StoryArrows, Tour, useClose, useModalOpen } from "./parts";

type Direction = "up" | "down" | "left" | "right" | null;

const SLIDE_IN: Record<NonNullable<Direction>, string> = {
  up: "animate-zalak-up",
  down: "animate-zalak-down",
  left: "animate-zalak-left",
  right: "animate-zalak-right",
};

/** A drag shorter than this is a tap. */
const SWIPE_PX = 45;
/** Holding the screen this long pauses the post. */
const HOLD_MS = 220;
/** The longest a clock tick may count, so a tab that was in the background does not skip ahead. */
const MAX_TICK_MS = 100;

/**
 * A shop's status: tap the right side for the next post (the last one moves on to the next shop), the left
 * side to go back, hold to pause. Each post plays for its own 5–15 seconds, shown by the bar at the top, and
 * the viewer closes after the last shop.
 */
export function StatusViewer({ stories, start = 0 }: { stories: ZalakStory[]; start?: number }) {
  const t = useT();
  const close = useClose();
  const [pos, setPos] = useState(() => {
    const s = Math.min(Math.max(start, 0), Math.max(stories.length - 1, 0));
    // Open on the first post not watched yet, like a stories bar does.
    const c = Math.max(stories[s]?.clips.findIndex((item) => item.seen === false) ?? 0, 0);
    return { s, c, dir: null as Direction };
  });
  const [holding, setHolding] = useState(false);
  const [muted, setMuted] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const tourPending = useTourPending("status");
  const showTour = tourPending && tourStep < 1 && stories.length > 0;
  // A dialog on top (the login after tapping Follow) holds the post where it is.
  const modalOpen = useModalOpen();
  const paused = holding || showTour || modalOpen;

  const story = stories[pos.s];
  const clip = story?.clips[pos.c];

  const elapsed = useRef(0);
  const fill = useRef<HTMLSpanElement>(null);

  function go(s: number, c: number, dir: Direction) {
    elapsed.current = 0;
    setPos({ s, c, dir });
  }

  function nextStory() {
    if (pos.s < stories.length - 1) go(pos.s + 1, 0, "up");
  }
  function previousStory() {
    if (pos.s > 0) go(pos.s - 1, 0, "down");
  }
  function nextClip() {
    if (pos.c < story.clips.length - 1) go(pos.s, pos.c + 1, "left");
    else if (pos.s < stories.length - 1) go(pos.s + 1, 0, "up");
    else close();
  }
  function previousClip() {
    if (pos.c > 0) go(pos.s, pos.c - 1, "right");
    else if (pos.s > 0) go(pos.s - 1, stories[pos.s - 1].clips.length - 1, "down");
    else go(0, 0, null);
  }

  // Always the latest closures, so the clock below keeps running when only the handlers change.
  const advance = useRef(nextClip);
  useEffect(() => {
    advance.current = nextClip;
  });

  // The clock: fills the current bar over the post's seconds, then moves on.
  useEffect(() => {
    if (!clip) return;
    const ms = clip.seconds * 1000;
    const bar = fill.current;
    if (bar) bar.style.transform = `scaleX(${Math.min(elapsed.current / ms, 1)})`;
    if (paused) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsed.current += Math.min(now - last, MAX_TICK_MS);
      last = now;
      const progress = Math.min(elapsed.current / ms, 1);
      if (bar) bar.style.transform = `scaleX(${progress})`;
      if (progress >= 1) advance.current();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pos.s, pos.c, paused, clip]);

  // A watched status turns its ring grey on the home page. A sample post counts when opened; a real one once it has
  // been on screen for a moment (the API remembers it), and the ring goes grey here when its last post is reached.
  const storyId = story?.id;
  const live = story?.live;
  const clipId = clip?.id;
  const last = Boolean(story && pos.c === story.clips.length - 1);
  useEffect(() => {
    if (!story || !storyId) return;
    if (!live) {
      markStatusSeen(storyId);
      return;
    }
    const timer = setTimeout(() => {
      reportSeen("status", clipId);
      if (last) markStatusSeen(ringSeenKey(story));
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, live, clipId, last]);

  // Keyboard for desktop.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modalOpen) return;
      if (event.key === "ArrowDown") nextStory();
      else if (event.key === "ArrowUp") previousStory();
      else if (event.key === "ArrowRight") nextClip();
      else if (event.key === "ArrowLeft") previousClip();
      else if (event.key === "Escape") close();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const gesture = useRef<{ x: number; y: number; held: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    const next = { x: event.clientX, y: event.clientY, held: false } as NonNullable<typeof gesture.current>;
    next.timer = setTimeout(() => {
      next.held = true;
      setHolding(true);
    }, HOLD_MS);
    gesture.current = next;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    clearTimeout(current.timer);
    setHolding(false);
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.abs(dy) > SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) nextStory();
      else previousStory();
    } else if (Math.abs(dx) > SWIPE_PX) {
      if (dx < 0) nextClip();
      else previousClip();
    } else if (!current.held) {
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX - box.left < box.width / 3) previousClip();
      else nextClip();
    }
  }

  function onPointerCancel() {
    if (gesture.current) clearTimeout(gesture.current.timer);
    gesture.current = null;
    setHolding(false);
  }

  if (!story || !clip) return <EmptyStage onClose={close} />;

  return (
    <Shell>
      <div key={`${pos.s}-${pos.c}`} className={cn("absolute inset-0", pos.dir && SLIDE_IN[pos.dir])}>
        <ClipMedia clip={clip} paused={paused} muted={muted} priority />
      </div>
      <Scrim />

      <div
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(event) => event.preventDefault()}
      />

      <Overlay
        story={story}
        kind="status"
        clip={clip}
        muted={muted}
        onMute={clip.kind === "video" ? () => setMuted((value) => !value) : undefined}
        onClose={close}
        bars={
          <ol className="flex gap-1" aria-label={t("Angle {n} of {total}", { n: pos.c + 1, total: story.clips.length })}>
            {story.clips.map((_, i) => (
              <li key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span
                  ref={i === pos.c ? fill : undefined}
                  className="block size-full origin-left bg-white"
                  style={i === pos.c ? undefined : { transform: `scaleX(${i < pos.c ? 1 : 0})` }}
                />
              </li>
            ))}
          </ol>
        }
      />

      {stories.length > 1 && <StoryArrows onPrevious={previousStory} onNext={nextStory} atStart={pos.s === 0} atEnd={pos.s === stories.length - 1} />}

      {showTour && (
        <Tour
          step={0}
          steps={[{ icon: ArrowLeftRight, text: t("Tap the right side for the next post, the left side to go back"), button: t("Tap anywhere to continue") }]}
          onNext={() => {
            markTourDone("status");
            setTourStep(1);
          }}
        />
      )}
    </Shell>
  );
}
