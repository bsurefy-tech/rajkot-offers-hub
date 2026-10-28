"use client";

import { ArrowLeftRight, ArrowUpDown } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { markTourDone, reportReelEvent, reportSeen, useTourPending } from "@/hooks/use-zalak-memory";
import { moreReelsAction } from "@/lib/actions/zalak";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { ZalakStory } from "@/lib/zalak/types";
import { ClipMedia, EmptyStage, Overlay, Scrim, Shell, StoryArrows, Tour, useClose, useModalOpen } from "./parts";

/** How close to the end the visitor gets before the next page of reels is fetched. */
const LOAD_AHEAD = 3;
/** How long a reel is on screen before it counts as seen. */
const SEEN_AFTER_MS = 1000;

/**
 * Zalak: a feed of reels. Scroll (or swipe up) for the next shop's reel, swipe sideways for another angle of the
 * same one. Nothing plays or moves on by itself, and the bars at the top only show which angle you are on. The
 * browser does the scrolling and snapping, so it feels native; only the reels near the screen load their pictures.
 */
export function ReelViewer({ initial, start = 0, feed: more }: { initial: ZalakStory[]; start?: number; feed?: { token?: string; hasMore: boolean } }) {
  const t = useT();
  const close = useClose();
  const feed = useRef<HTMLDivElement>(null);
  const [stories, setStories] = useState(initial);
  const [hasMore, setHasMore] = useState(more?.hasMore ?? false);
  // The page fetched last and the token that keeps the order still across pages.
  const paging = useRef({ page: 1, token: more?.token });
  const loading = useRef(false);
  const first = Math.min(Math.max(start, 0), Math.max(initial.length - 1, 0));
  const [active, setActive] = useState(first);
  /** The angle each reel is showing, by reel index. */
  const [angles, setAngles] = useState<Record<number, number>>({});
  const [muted, setMuted] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  const tourPending = useTourPending("reel");
  const showTour = tourPending && tourStep < 2 && stories.length > 0;
  // A dialog on top (the login after tapping Follow) stops the video and the keys.
  const modalOpen = useModalOpen();

  const story = stories[active];
  const angle = Math.min(angles[active] ?? 0, Math.max((story?.clips.length ?? 1) - 1, 0));

  // A reel counts as seen (so it is not served again) and as watched once it has been on screen for a moment.
  const activeId = stories[active]?.id;
  const activeLive = stories[active]?.live;
  useEffect(() => {
    if (!activeId || !activeLive) return;
    const timer = setTimeout(() => {
      reportSeen("reel", activeId);
      reportReelEvent(activeId, "view");
    }, SEEN_AFTER_MS);
    return () => clearTimeout(timer);
  }, [activeId, activeLive]);

  // Open on the reel that was tapped.
  useLayoutEffect(() => {
    const el = feed.current;
    if (el && first > 0) el.scrollTop = first * el.clientHeight;
  }, [first]);

  const loadMore = useCallback(async () => {
    if (loading.current || !hasMore) return;
    loading.current = true;
    const next = await moreReelsAction(paging.current.page + 1, paging.current.token);
    paging.current = { page: paging.current.page + 1, token: next.token ?? paging.current.token };
    setStories((current) => {
      const known = new Set(current.map((reel) => reel.id));
      return [...current, ...next.stories.filter((reel) => !known.has(reel.id))];
    });
    if (!next.hasMore || next.stories.length === 0) setHasMore(false);
    loading.current = false;
  }, [hasMore]);

  function onFeedScroll() {
    const el = feed.current;
    if (!el) return;
    const index = Math.min(Math.round(el.scrollTop / el.clientHeight), stories.length - 1);
    if (index !== active) setActive(index);
    if (index >= stories.length - LOAD_AHEAD) void loadMore();
  }

  function onTrackScroll(index: number, track: HTMLElement) {
    const at = Math.round(track.scrollLeft / track.clientWidth);
    setAngles((current) => (current[index] === at ? current : { ...current, [index]: at }));
  }

  function goStory(delta: number) {
    const el = feed.current;
    const target = Math.min(Math.max(active + delta, 0), stories.length - 1);
    if (el && target !== active) el.scrollTo({ top: target * el.clientHeight, behavior: "smooth" });
  }

  function goAngle(delta: number) {
    const track = feed.current?.querySelector<HTMLElement>(`[data-slide="${active}"] [data-track]`);
    if (!track || !story) return;
    const target = angle + delta;
    if (target < 0 || target >= story.clips.length) return goStory(delta);
    track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
  }

  // Keyboard for desktop.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modalOpen) return;
      if (event.key === "ArrowDown") goStory(1);
      else if (event.key === "ArrowUp") goStory(-1);
      else if (event.key === "ArrowRight") goAngle(1);
      else if (event.key === "ArrowLeft") goAngle(-1);
      else if (event.key === "Escape") close();
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!story) return <EmptyStage onClose={close} />;
  const clip = story.clips[angle];

  return (
    <Shell>
      <div
        ref={feed}
        onScroll={onFeedScroll}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain"
      >
        {stories.map((reel, s) => {
          const near = Math.abs(s - active) <= 1;
          return (
            <section
              key={reel.id}
              data-slide={s}
              className="h-full w-full snap-start snap-always"
              onClick={(event) => {
                // A tap on the picture: the right side for the next angle, the left third for the one before.
                if (s !== active) return;
                const box = event.currentTarget.getBoundingClientRect();
                goAngle(event.clientX - box.left < box.width / 3 ? -1 : 1);
              }}
            >
              <div
                data-track
                onScroll={(event) => onTrackScroll(s, event.currentTarget)}
                className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
              >
                {reel.clips.map((item, c) => (
                  <div key={c} className="relative h-full w-full min-w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
                    {near && (
                      <ClipMedia
                        clip={item}
                        still
                        muted={muted}
                        paused={modalOpen || s !== active || c !== (angles[s] ?? 0)}
                        priority={s === first && c === 0}
                        onComplete={reel.live ? () => reportReelEvent(reel.id, "complete") : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <Scrim />

      <Overlay
        story={story}
        kind="reel"
        clip={clip}
        muted={muted}
        onMute={clip.kind === "video" ? () => setMuted((value) => !value) : undefined}
        onClose={close}
        bars={
          story.clips.length > 1 ? (
            <ol className="flex gap-1" aria-label={t("Angle {n} of {total}", { n: angle + 1, total: story.clips.length })}>
              {story.clips.map((_, i) => (
                <li key={i} className={cn("h-[3px] flex-1 rounded-full transition-colors", i === angle ? "bg-white" : "bg-white/35")} />
              ))}
            </ol>
          ) : null
        }
      />

      {stories.length > 1 && <StoryArrows onPrevious={() => goStory(-1)} onNext={() => goStory(1)} atStart={active === 0} atEnd={active === stories.length - 1} />}

      {showTour && (
        <Tour
          step={tourStep}
          steps={[
            { icon: ArrowUpDown, text: t("Swipe up or down for more reels"), button: t("Tap for next") },
            { icon: ArrowLeftRight, text: t("Swipe sideways for another angle of the same offer"), button: t("Tap anywhere to continue") },
          ]}
          onNext={() => {
            if (tourStep === 0) setTourStep(1);
            else {
              markTourDone("reel");
              setTourStep(2);
            }
          }}
        />
      )}
    </Shell>
  );
}
