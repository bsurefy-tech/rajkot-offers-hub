"use client";

import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToggleSave } from "@/components/offers/save-button";
import { useT } from "@/lib/i18n/client";

/** Not following yet: a soft ring keeps pulsing around the button (and the bell rings) to draw the eye. Still for reduced motion. */
const PULSE = "animate-follow-pulse motion-reduce:animate-none";

function FollowIcon({ following }: { following: boolean }) {
  return following ? <BellRing size={18} aria-hidden /> : <Bell size={18} aria-hidden className="origin-top animate-bell-ring motion-reduce:animate-none" />;
}

/**
 * "Follow" on a shop: new offers from it are put first for the visitor and announced in their notifications.
 * Not the same as Save, which is only a private bookmark. A guest is asked to log in first.
 */
export function FollowButton({ slug, className }: { slug: string; className?: string }) {
  const t = useT();
  const { saved: following, onToggle } = useToggleSave(slug, "follow");
  return (
    <Button
      variant={following ? "outline" : "primary"}
      size="sm"
      aria-pressed={following}
      onClick={onToggle}
      className={cn(!following && PULSE, className)}
    >
      <FollowIcon following={following} />
      {following ? t("Following") : t("Follow")}
    </Button>
  );
}

/** Full-width Follow button for the mobile bottom bar, beside Save and Share. */
export function FollowBarButton({ slug }: { slug: string }) {
  const t = useT();
  const { saved: following, onToggle } = useToggleSave(slug, "follow");
  return (
    <Button
      variant={following ? "outline" : "primary"}
      size="sm"
      aria-pressed={following}
      onClick={onToggle}
      className={cn("min-w-0 flex-1 px-2", following ? "border-primary text-primary hover:bg-primary-soft" : PULSE)}
    >
      <FollowIcon following={following} />
      {following ? t("Following") : t("Follow")}
    </Button>
  );
}
