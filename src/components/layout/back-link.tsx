"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { IconLink } from "@/components/ui/icon-button";
import { useT } from "@/lib/i18n/client";

/** The slice of the Navigation API used here (not in every TypeScript DOM lib yet). */
type NavigationLike = { canGoBack: boolean };

interface BackLinkProps {
  /** Where the arrow goes when there is no earlier page on this site (shared link, new tab, refresh). */
  fallbackHref: string;
  variant?: "plain" | "floating";
}

/**
 * Back arrow that returns to the page the visitor came from, filters and scroll position included.
 * It is still a real link to `fallbackHref`, and only goes back in history when this tab has an
 * earlier page on this site, so a visitor who arrived from a shared link is never sent off the site.
 */
export function BackLink({ fallbackHref, variant = "plain" }: BackLinkProps) {
  const router = useRouter();
  const t = useT();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // canGoBack only counts earlier same-origin entries of this tab; without the API, use the link.
    const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;
    if (!navigation?.canGoBack) return;
    event.preventDefault();
    router.back();
  }

  return (
    <IconLink href={fallbackHref} onClick={onClick} variant={variant} size="lg" aria-label={t("Go back")}>
      <ArrowLeft size={variant === "floating" ? 20 : 22} aria-hidden />
    </IconLink>
  );
}
