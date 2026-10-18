import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const variants = {
  /** Pink discount badge on offer images. */
  offer: "bg-primary text-white",
  /** Grey badge for expired offers. */
  expired: "bg-muted text-white",
  /** Small grey category chip. */
  neutral: "bg-surface text-muted font-medium",
} as const;

const sizes = {
  sm: "px-2.5 py-[7px] text-caption",
  md: "px-2.5 py-1.5 text-caption",
  xs: "px-2.5 py-1.5 text-caption",
} as const;

export function Badge({
  variant = "offer",
  size = "sm",
  className,
  ...props
}: ComponentProps<"span"> & { variant?: keyof typeof variants; size?: keyof typeof sizes }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full leading-none font-semibold",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
