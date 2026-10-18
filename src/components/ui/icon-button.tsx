import { Link } from "@/components/i18n/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  /** Transparent header button. */
  plain: "rounded-full text-ink hover:bg-surface",
  /** White round button floating over images. */
  floating: "rounded-full bg-white text-ink shadow-card hover:bg-surface",
  /** Grey round button (sheet close). */
  soft: "rounded-full bg-surface text-ink hover:bg-canvas",
  /** Square bordered button (filter). */
  square: "rounded-xl border border-input bg-white text-ink hover:border-ink",
  /** Square filled button (active filter). */
  squareActive: "rounded-xl border border-ink bg-ink text-white",
} as const;

const sizes = { sm: "size-8", md: "size-9", lg: "size-10", xl: "size-[46px]" } as const;

interface IconButtonStyle {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Count shown as a pink dot at the top right. */
  count?: number;
}

function classes({ variant = "plain", size = "md" }: IconButtonStyle, className?: string) {
  return cn(
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors",
    variants[variant],
    sizes[size],
    className,
  );
}

function CountBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 flex size-[18px] items-center justify-center rounded-full bg-primary text-micro font-semibold text-white ring-2 ring-white">
      {count}
    </span>
  );
}

export function IconButton({
  variant,
  size,
  count,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & IconButtonStyle & { "aria-label": string }) {
  return (
    <button type={type} className={classes({ variant, size }, className)} {...props}>
      {children}
      <CountBadge count={count} />
    </button>
  );
}

export function IconLink({
  variant,
  size,
  count,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & IconButtonStyle & { "aria-label": string }) {
  return (
    <Link className={classes({ variant, size }, className)} {...props}>
      {children}
      <CountBadge count={count} />
    </Link>
  );
}
