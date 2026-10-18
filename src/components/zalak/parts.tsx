"use client";

import { Bookmark, ChevronDown, ChevronUp, Heart, Share2, Volume2, VolumeX, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link } from "@/components/i18n/link";
import { useLogin } from "@/components/auth/login-dialog";
import { useToggleSave } from "@/components/offers/save-button";
import { buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { reportReelEvent, useLikedStories } from "@/hooks/use-zalak-memory";
import { setReactionAction } from "@/lib/actions/zalak";
import { formatDistance } from "@/lib/format";
import { localizePath } from "@/lib/i18n/config";
import { useLocale, useT } from "@/lib/i18n/client";
import { offerPath, shopPath } from "@/lib/paths";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { ZalakClip, ZalakKind, ZalakLink, ZalakStory } from "@/lib/zalak/types";
import { ShopAvatar } from "./avatar";
import { ReportButton } from "./report";

/**
 * The look shared by reels and statuses: the black stage, the shop at the top, the offer and the actions
 * at the bottom. How the two behave (a scrolling feed, or tap-through posts) lives in their own viewers.
 */

/** The current minute, so "2h ago" renders after hydration instead of from the server's clock. */
export function useNow() {
  return useSyncExternalStore(
    () => () => {},
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );
}

/** Things happening outside the page that should hold the viewer, like the phone's own share sheet. */
let holds = 0;
const holdListeners = new Set<() => void>();

/** Holds the viewer for as long as `task` runs. */
async function whileHeld<T>(task: () => Promise<T>) {
  holds++;
  holdListeners.forEach((listener) => listener());
  try {
    return await task();
  } finally {
    holds--;
    holdListeners.forEach((listener) => listener());
  }
}

function subscribeHolds(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
  holdListeners.add(onChange);
  return () => {
    observer.disconnect();
    holdListeners.delete(onChange);
  };
}

/** Whether something is open on top of the viewer: a sheet or dialog (the login), or the share sheet. The viewer holds still while one is. */
export function useModalOpen() {
  return useSyncExternalStore(
    subscribeHolds,
    () => holds > 0 || document.querySelector("dialog[open]") !== null,
    () => false,
  );
}

/** Back to where the visitor came from, or Home when the viewer was opened directly. */
export function useClose() {
  const router = useRouter();
  const locale = useLocale();
  return useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push(localizePath(locale, "/"));
  }, [router, locale]);
}

/** Black screen on a phone; a centred phone-shaped column on a desktop. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black">
      <div className="relative h-dvh w-full max-w-[460px] overflow-hidden bg-black select-none">{children}</div>
    </div>
  );
}

export function EmptyStage({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <Shell>
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-white">
        <p className="text-body">{t("Nothing here yet. Check back soon.")}</p>
        <button type="button" onClick={onClose} className={buttonClass({ variant: "primary" })}>
          {t("Close")}
        </button>
      </div>
    </Shell>
  );
}

/** Darkens the top and bottom of the picture so the white text stays readable. */
export function Scrim() {
  return <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/65 via-transparent via-30% to-black/85" />;
}

/** Up and down buttons beside the column, for a mouse. */
export function StoryArrows({ onPrevious, onNext, atStart, atEnd }: { onPrevious: () => void; onNext: () => void; atStart: boolean; atEnd: boolean }) {
  const t = useT();
  return (
    <div className="absolute top-1/2 right-4 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      <ArrowButton label={t("Previous")} disabled={atStart} onClick={onPrevious}>
        <ChevronUp size={22} aria-hidden />
      </ArrowButton>
      <ArrowButton label={t("Next")} disabled={atEnd} onClick={onNext}>
        <ChevronDown size={22} aria-hidden />
      </ArrowButton>
    </div>
  );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30 disabled:cursor-default disabled:opacity-30"
    >
      {children}
    </button>
  );
}

interface ClipMediaProps {
  clip: ZalakClip;
  /** A photo drifts closer while it plays unless it is `still`; a video plays unless it is paused. */
  paused: boolean;
  muted: boolean;
  still?: boolean;
  priority?: boolean;
  /** A video reached its end (it loops, so this is once per play-through). */
  onComplete?: () => void;
}

const HLS = /\.m3u8(\?|$)/;

export function ClipMedia({ clip, paused, muted, still, priority, onComplete }: ClipMediaProps) {
  const video = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const streamed = clip.kind === "video" && HLS.test(clip.src);

  // The API's videos are HLS streams: Safari plays them as they are, other browsers through hls.js (loaded only when needed).
  useEffect(() => {
    const el = video.current;
    if (!el || !streamed) return;
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = clip.src;
      return;
    }
    let player: { destroy: () => void } | undefined;
    let gone = false;
    void import("hls.js").then(({ default: Hls }) => {
      if (gone) return;
      if (!Hls.isSupported()) {
        el.src = clip.src;
        return;
      }
      const hls = new Hls({ maxBufferLength: 10 });
      player = hls;
      hls.loadSource(clip.src);
      hls.attachMedia(el);
      // A stream that cannot be played leaves the poster showing instead of retrying forever.
      hls.on(Hls.Events.ERROR, (_event, data) => data.fatal && hls.destroy());
    });
    return () => {
      gone = true;
      player?.destroy();
    };
  }, [clip.src, streamed]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (paused) el.pause();
    else void el.play().catch(() => {});
  }, [paused, clip]);

  if (clip.kind === "video") {
    return (
      <video
        ref={video}
        src={streamed ? undefined : clip.src}
        poster={clip.poster}
        muted={muted}
        loop
        autoPlay={!paused}
        playsInline
        preload="metadata"
        onTimeUpdate={(event) => {
          // The video loops, so it never ends: near the end counts once, and again after it has come round.
          const el = event.currentTarget;
          if (!onComplete || !Number.isFinite(el.duration)) return;
          if (el.currentTime < 1) finished.current = false;
          else if (!finished.current && el.currentTime >= el.duration - 0.35) {
            finished.current = true;
            onComplete();
          }
        }}
        className="size-full object-cover"
      />
    );
  }
  return (
    <Image
      src={clip.src}
      alt=""
      fill
      priority={priority}
      sizes="(min-width: 460px) 460px, 100vw"
      draggable={false}
      className={cn("object-cover", !still && "animate-zalak-zoom motion-reduce:animate-none")}
      style={still ? undefined : { animationDuration: `${clip.seconds}s`, animationPlayState: paused ? "paused" : "running" }}
    />
  );
}

interface OverlayProps {
  story: ZalakStory;
  kind: ZalakKind;
  clip: ZalakClip;
  /** The progress or position bars, drawn above the shop. */
  bars: ReactNode;
  muted: boolean;
  onMute?: () => void;
  onClose: () => void;
}

/** Everything drawn over the picture. It lets touches through to the picture except on its own buttons. */
export function Overlay({ story, kind, clip, bars, muted, onMute, onClose }: OverlayProps) {
  const t = useT();
  // A status says its own thing and points at its own place; a sample post uses the offer it was made from.
  const text = clip.caption ?? story.title;
  const target: ZalakLink | undefined = clip.link ?? (story.offer ? { href: offerPath({ businessSlug: story.offer.businessSlug, urlSlug: story.offer.urlSlug }), kind: "offer" } : undefined);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-[calc(env(safe-area-inset-bottom)+14px)]">
      <div className="flex flex-col gap-3">
        {bars}
        <Header story={story} kind={kind} clip={clip} onClose={onClose} />
      </div>

      {/* Everything below sits together at the bottom edge: the offer, the actions, then the button. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 pb-1 text-white">
            {!clip.caption && story.caption && <span className="mb-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-caption font-semibold">{story.caption}</span>}
            {text && <h2 className="line-clamp-2 text-heading leading-snug font-semibold">{text}</h2>}
          </div>
          <Rail story={story} clip={clip} muted={muted} onMute={onMute} />
        </div>

        {target && (
          <Link
            href={target.href}
            onClick={() => story.kind === "reel" && story.live && reportReelEvent(story.id, "link_tap")}
            className={buttonClass({ variant: "primary", block: true, className: "pointer-events-auto" })}
          >
            {target.kind === "offer" ? t("View offer") : t("Visit shop")}
          </Link>
        )}
      </div>
    </div>
  );
}

function Header({ story, kind, clip, onClose }: { story: ZalakStory; kind: ZalakKind; clip: ZalakClip; onClose: () => void }) {
  const t = useT();
  const now = useNow();
  const posted = clip.postedAt ?? story.postedAt;
  const ago = posted && now ? Math.max(Math.floor((now - new Date(posted).getTime()) / 3_600_000), 0) : null;
  const detail =
    kind === "status"
      ? ago === null
        ? null
        : ago < 1
          ? t("Just now")
          : t("{hours}h ago", { hours: ago })
      : clip.kind === "video"
        ? `0:${String(clip.seconds).padStart(2, "0")}`
        : null;
  return (
    <div className="pointer-events-auto flex items-center gap-2.5 text-white">
      <Link href={story.shop.platform ? "/" : shopPath(story.shop.slug)} className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white/20">
          <ShopAvatar shop={story.shop} sizes="40px" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold">{story.shop.name}</span>
          <span className="block truncate text-caption text-white/85">{[detail, story.distanceKm === undefined ? null : formatDistance(story.distanceKm, t), story.shop.areaName].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
      {!story.shop.platform && <FollowPill slug={story.shop.slug} />}
      <ReportButton story={story} clip={clip} />
      <button type="button" aria-label={t("Close")} onClick={onClose} className="-mr-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/15">
        <X size={24} aria-hidden />
      </button>
    </div>
  );
}

function FollowPill({ slug }: { slug: string }) {
  const t = useT();
  const { saved, onToggle } = useToggleSave(slug, "follow");
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={onToggle}
      className={cn(
        "shrink-0 cursor-pointer rounded-full border-[1.5px] border-white px-3 py-1 text-caption font-semibold transition-colors",
        saved ? "bg-white text-primary" : "text-white hover:bg-white/15",
      )}
    >
      {saved ? t("Following") : t("Follow")}
    </button>
  );
}

/** A post's like or save: the API's when the post came from it (a guest is asked to log in), this browser's own like for the sample posts. */
function useReaction(story: ZalakStory, clip: ZalakClip, reaction: "like" | "save") {
  const t = useT();
  const toast = useToast();
  const login = useLogin();
  const memory = useLikedStories();
  const [mine, setMine] = useState<Record<string, { on: boolean; count: number }>>({});
  const id = clip.id;

  if (!story.live || !id) {
    const liked = reaction === "like" && memory.isLiked(story.id);
    return { on: liked, count: liked ? 1 : 0, toggle: () => memory.toggle(story.id) };
  }

  const start = reaction === "like" ? { on: clip.liked ?? false, count: clip.likes ?? 0 } : { on: clip.saved ?? false, count: 0 };
  const key = `${reaction}:${id}`;
  const current = mine[key] ?? start;

  async function send(want: boolean, retry: boolean) {
    const before = mine[key] ?? start;
    setMine((all) => ({ ...all, [key]: { on: want, count: Math.max(0, before.count + (want === before.on || reaction === "save" ? 0 : want ? 1 : -1)) } }));
    const result = await setReactionAction(story.kind, id!, reaction, want);
    if (result === "ok") return;
    setMine((all) => ({ ...all, [key]: before }));
    if (result === "signed-out" && retry) login.prompt(() => void send(want, false));
    else toast(t("Could not save. Please try again."));
  }

  return { on: current.on, count: current.count, toggle: () => void send(!current.on, true) };
}

function Rail({ story, clip, muted, onMute }: { story: ZalakStory; clip: ZalakClip; muted: boolean; onMute?: () => void }) {
  const t = useT();
  const toast = useToast();
  const locale = useLocale();
  const like = useReaction(story, clip, "like");

  function share() {
    const path = clip.link?.href ?? (story.offer ? offerPath({ businessSlug: story.offer.businessSlug, urlSlug: story.offer.urlSlug }) : story.shop.platform ? "/" : shopPath(story.shop.slug));
    const url = `${site.url}${localizePath(locale, path)}`;
    if (story.kind === "reel" && story.live) reportReelEvent(story.id, "share");
    // The phone's share sheet is not part of the page, so the viewer is held for as long as it is open.
    return whileHeld(async () => {
      try {
        if (navigator.share) {
          await navigator.share({ title: clip.caption ?? story.title ?? story.shop.name, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        toast(t("Link copied"));
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") toast(t("Could not share. Please try again."));
      }
    });
  }

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-5 pb-1">
      <RailButton label={t("Like")} count={like.count} pressed={like.on} onClick={like.toggle}>
        <Heart size={30} strokeWidth={1.8} aria-hidden className={cn(like.on && "fill-primary text-primary")} />
      </RailButton>
      {story.live && story.kind === "reel" ? <SaveReelRail story={story} clip={clip} /> : story.offer && <SaveRail slug={story.offer.slug} />}
      <RailButton label={t("Share")} onClick={share}>
        <Share2 size={28} strokeWidth={1.8} aria-hidden />
      </RailButton>
      {onMute && (
        <RailButton label={muted ? t("Unmute") : t("Mute")} onClick={onMute}>
          {muted ? <VolumeX size={28} strokeWidth={1.8} aria-hidden /> : <Volume2 size={28} strokeWidth={1.8} aria-hidden />}
        </RailButton>
      )}
    </div>
  );
}

function SaveReelRail({ story, clip }: { story: ZalakStory; clip: ZalakClip }) {
  const t = useT();
  const save = useReaction(story, clip, "save");
  return (
    <RailButton label={save.on ? t("Saved") : t("Save")} pressed={save.on} onClick={save.toggle}>
      <Bookmark size={28} strokeWidth={1.8} aria-hidden className={cn(save.on && "fill-primary text-primary")} />
    </RailButton>
  );
}

function SaveRail({ slug }: { slug: string }) {
  const t = useT();
  const { saved, onToggle } = useToggleSave(slug, "offer");
  return (
    <RailButton label={saved ? t("Saved") : t("Save")} pressed={saved} onClick={onToggle}>
      <Bookmark size={28} strokeWidth={1.8} aria-hidden className={cn(saved && "fill-primary text-primary")} />
    </RailButton>
  );
}

/** An icon with a bold label under it (and a count under that), straight on the picture. */
function RailButton({ label, count, pressed, onClick, children }: { label: string; count?: number; pressed?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="flex w-14 cursor-pointer flex-col items-center gap-1 text-white [filter:drop-shadow(0_1px_3px_rgb(0_0_0/0.55))]"
    >
      {children}
      <span className="text-body-sm leading-none font-semibold">{label}</span>
      {count !== undefined && <span className="text-body-sm leading-none font-medium text-white/90">{count}</span>}
    </button>
  );
}

export interface TourStep {
  icon: LucideIcon;
  text: string;
  button: string;
}

/** The "how to use it" hint over a blurred picture, shown once on a device. One tap moves on, and the last one closes it. */
export function Tour({ steps, step, onNext }: { steps: TourStep[]; step: number; onNext: () => void }) {
  const { icon: Icon, text, button } = steps[step];
  return (
    <button
      type="button"
      onClick={onNext}
      className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center gap-5 bg-black/55 px-10 text-center text-white backdrop-blur-xl"
    >
      <span className="flex size-24 items-center justify-center rounded-full border border-white/35 bg-white/10">
        <Icon size={36} strokeWidth={2.2} aria-hidden />
      </span>
      <p className="text-body leading-snug text-white/90">{text}</p>
      {steps.length > 1 && (
        <span aria-hidden className="flex gap-1.5">
          {steps.map((_, i) => (
            <i key={i} className={cn("h-2 rounded-full transition-all", i === step ? "w-7 bg-white" : "w-2 bg-white/50")} />
          ))}
        </span>
      )}
      <span className="rounded-full border border-white/50 px-6 py-2 text-body">{button}</span>
    </button>
  );
}
