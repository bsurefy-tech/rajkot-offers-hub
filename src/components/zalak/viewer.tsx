"use client";

import type { ZalakKind, ZalakStory } from "@/lib/zalak/types";
import { ReelViewer } from "./reel-viewer";
import { StatusViewer } from "./status-viewer";

interface ZalakViewerProps {
  stories: ZalakStory[];
  kind: ZalakKind;
  /** Index of the story to open on. */
  start?: number;
  /** Where the reel feed stands: whether more pages follow and the token that keeps their order still. */
  feed?: { token?: string; hasMore: boolean };
}

/**
 * One look, two behaviours. Zalak is a reel feed: scroll for the next shop's reel, swipe sideways for another
 * angle of it, nothing plays by itself. A status is a shop's post of the day: tap through it, one after another.
 */
export function ZalakViewer({ stories, kind, start = 0, feed }: ZalakViewerProps) {
  return kind === "reel" ? <ReelViewer initial={stories} start={start} feed={feed} /> : <StatusViewer stories={stories} start={start} />;
}
