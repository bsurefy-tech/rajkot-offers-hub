"use client";

import { Bookmark } from "lucide-react";
import { useLogin } from "@/components/auth/login-dialog";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { loadSaves, useSaved } from "@/hooks/use-saved";
import type { SaveKind } from "@/lib/actions/saves";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/** `slug` is an offer's handle or a shop's slug, depending on `kind`. A guest is asked to log in first, then it is saved (or followed). */
export function useToggleSave(slug: string, kind: SaveKind) {
  const { isSaved, toggle } = useSaved(kind);
  const login = useLogin();
  const toast = useToast();
  const t = useT();
  const saved = isSaved(slug);

  /** False for a guest: nothing was changed. */
  const apply = (want?: boolean) => {
    const change = toggle(slug, want);
    if (!change) return false;
    if (kind === "follow") toast(change.saved ? t("Following. We'll tell you about this shop's new offers.") : t("Unfollowed"));
    else toast(change.saved ? t(kind === "shop" ? "Shop saved" : "Offer saved") : t("Removed from saved"));
    // The change goes to the API and can fail.
    void change.done.then((ok) => ok || toast(t("Could not save. Please try again.")));
    return true;
  };

  const onToggle = () => {
    if (apply()) return;
    // A guest, or the account's saves are not here yet: log in if needed, load them, then save.
    const afterLogin = (justLoggedIn: boolean) =>
      void loadSaves().then((member) => {
        if (member) apply(true);
        // The sign-in hint was stale (the session ended): ask once more.
        else if (!justLoggedIn) login.prompt(() => afterLogin(true));
        else toast(t("Could not save. Please try again."));
      });
    if (login.signedIn()) afterLogin(false);
    else login.prompt(() => afterLogin(true));
  };
  return { saved, onToggle };
}

function SaveIcon({ saved, size }: { saved: boolean; size: number }) {
  return (
    <Bookmark
      size={size}
      aria-hidden
      className={cn(saved && "fill-primary text-primary")}
    />
  );
}

/** Round bookmark button: over an image ("floating") or on a plain bar ("plain"). */
export function SaveButton({
  slug,
  kind = "offer",
  size = "md",
  variant = "floating",
  className,
}: {
  slug: string;
  kind?: SaveKind;
  size?: "md" | "lg";
  variant?: "floating" | "plain";
  className?: string;
}) {
  const t = useT();
  const { saved, onToggle } = useToggleSave(slug, kind);
  return (
    <IconButton
      variant={variant}
      size={size}
      aria-label={saved ? t("Remove from saved") : t(kind === "shop" ? "Save shop" : "Save offer")}
      aria-pressed={saved}
      onClick={onToggle}
      className={className}
    >
      <SaveIcon saved={saved} size={size === "lg" ? 20 : 18} />
    </IconButton>
  );
}

/** Text button "Save": plain, or outlined like the Share button beside it in a header. */
export function SaveTextButton({ slug, kind = "offer", variant = "ghost" }: { slug: string; kind?: SaveKind; variant?: "ghost" | "outline" }) {
  const t = useT();
  const { saved, onToggle } = useToggleSave(slug, kind);
  return (
    <Button variant={variant} size="sm" aria-pressed={saved} onClick={onToggle} className={variant === "ghost" ? "px-2" : undefined}>
      <SaveIcon saved={saved} size={18} />
      {saved ? t("Saved") : t("Save")}
    </Button>
  );
}

/** Full-width bookmark button with a label, for the mobile bottom bar (`outline` when it sits beside a primary action). */
export function SaveBarButton({ slug, kind = "offer", variant = "outline" }: { slug: string; kind?: SaveKind; variant?: "primary" | "outline" }) {
  const t = useT();
  const { saved, onToggle } = useToggleSave(slug, kind);
  const outline = variant === "outline";
  return (
    <Button
      variant={outline ? "outline" : "primary"}
      size="sm"
      aria-pressed={saved}
      onClick={onToggle}
      className={cn("min-w-0 flex-1", outline && "border-primary px-2 text-primary hover:bg-primary-soft")}
    >
      <Bookmark size={18} aria-hidden className={cn(saved && (outline ? "fill-primary" : "fill-white"))} />
      {saved ? t("Saved") : t("Save")}
    </Button>
  );
}
