"use client";

import { Languages } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  languageSwitchEnabled,
  localeNames,
  localizePath,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Switches the current page to the other language and remembers the
 * choice in a cookie so the proxy opens the site in it next time.
 */
export function LanguageToggle({ className }: { className?: string }) {
  return languageSwitchEnabled ? <Toggle className={className} /> : null;
}

function Toggle({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const target: Locale = locale === "en" ? "gu" : "en";
  const { path } = splitLocale(pathname);
  const href = localizePath(target, path);

  return (
    <Link
      href={href}
      // The query string is read at click time so this stays static for prerendering.
      onClick={(event) => {
        event.preventDefault();
        document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
        router.replace(`${href}${window.location.search}${window.location.hash}`);
      }}
      lang={target}
      hrefLang={target}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-body-sm font-medium hover:border-input lg:h-10",
        className,
      )}
    >
      <Languages size={15} aria-hidden />
      {localeNames[target]}
    </Link>
  );
}
