"use client";

import { Form } from "@/components/i18n/link";
import { Search } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const variants = {
  /** Home hero: tall, shadowed, with a "search" button on desktop. */
  hero: "h-[54px] rounded-2xl border-line shadow-card lg:h-[60px] lg:pr-2",
  /** Offers page, mobile: flat. */
  page: "h-[46px] rounded-xl border-input",
  /** Offers page, desktop: shadowed. */
  pageLarge: "h-[52px] rounded-[14px] border-line shadow-card",
} as const;

interface SearchBarProps {
  variant?: keyof typeof variants;
  defaultValue?: string;
  /** Page the search submits to, e.g. "/offers" or "/offers/food". */
  action?: string;
  className?: string;
}

/** GET form to <action>?q=…, so search works without JavaScript. */
export function SearchBar({ variant = "page", defaultValue, action = "/offers", className }: SearchBarProps) {
  const t = useT();
  const placeholder = t("Search for a shop, offer or category");
  return (
    <Form
      action={action}
      role="search"
      className={cn(
        "flex items-center gap-2.5 border bg-white pl-4 focus-within:border-primary focus-within:shadow-ring",
        variants[variant],
        className,
      )}
    >
      <Search size={variant === "hero" ? 20 : 18} className="shrink-0 text-muted" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent pr-3 text-field text-ellipsis outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {variant === "hero" && (
        <button type="submit" className={buttonClass({ size: "sm", className: "hidden h-11 px-6 lg:inline-flex" })}>
          {t("Search")}
        </button>
      )}
    </Form>
  );
}
