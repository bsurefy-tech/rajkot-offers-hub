"use client";

import { Link } from "@/components/i18n/link";
import { ringSeenKey, useSeenStatuses } from "@/hooks/use-zalak-memory";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { ZalakStory } from "@/lib/zalak/types";
import { ShopAvatar } from "./avatar";

/**
 * Shops with something new today, as rings like a stories bar: pink until watched, then grey.
 * Each opens the status viewer on that shop.
 */
export function StatusRow({ stories }: { stories: ZalakStory[] }) {
  const t = useT();
  const seen = useSeenStatuses();
  if (stories.length === 0) return null;
  return (
    <ul aria-label={t("Status")} className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 lg:mx-0 lg:gap-6 lg:px-0">
      {stories.map((story) => {
        // The API says what the viewer has not watched; this browser's memory covers what was watched since the page loaded.
        const watched = story.live ? !story.unseen || seen.has(ringSeenKey(story)) : seen.has(story.id);
        return (
          <li key={story.id} className="w-[68px] shrink-0 lg:w-20">
            <Link href={story.shop.platform ? "/status?platform=1" : `/status?shop=${encodeURIComponent(story.shop.slug)}`} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "block size-[68px] rounded-full p-[3px] lg:size-20",
                  watched ? "bg-line-strong" : "bg-[conic-gradient(var(--color-primary),#ff8a3d,var(--color-primary))]",
                )}
              >
                <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full border-[2.5px] border-white bg-surface text-muted">
                  <ShopAvatar shop={story.shop} sizes="80px" iconSize={24} />
                </span>
              </span>
              <span className={cn("w-full truncate text-center text-caption", watched ? "text-muted" : "font-medium")}>{story.shop.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
