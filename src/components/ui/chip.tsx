import { Link } from "@/components/i18n/link";
import { Check, MapPin, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-[34px] px-3.5 text-body-sm",
  md: "h-9 px-4 text-body-sm",
  lg: "h-[38px] px-[18px] text-body",
  xl: "h-10 px-3.5 text-body",
} as const;

const tones = {
  /** Filter chips: dark when selected. */
  dark: {
    on: "border-ink bg-ink text-white",
    off: "border-input bg-white text-ink hover:border-ink",
  },
  /** Form choice chips: pink when selected, with a check. */
  brand: {
    on: "border-primary bg-primary-soft text-primary font-semibold",
    off: "border-input bg-white text-ink hover:border-line-strong",
  },
} as const;

export interface ChipStyle {
  selected?: boolean;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
}

export function chipClass({ selected, size = "md", tone = "dark" }: ChipStyle, className?: string) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border font-medium whitespace-nowrap transition-colors",
    sizes[size],
    selected ? tones[tone].on : tones[tone].off,
    className,
  );
}

function ChipContent({ selected, tone, children }: ChipStyle & { children: ReactNode }) {
  return (
    <>
      {selected && tone === "brand" && <Check size={14} strokeWidth={2.5} aria-hidden />}
      {children}
    </>
  );
}

export function Chip({
  selected,
  size,
  tone,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & ChipStyle) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={chipClass({ selected, size, tone }, className)}
      {...props}
    >
      <ChipContent selected={selected} tone={tone}>
        {children}
      </ChipContent>
    </button>
  );
}

export function ChipLink({
  selected,
  size,
  tone,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & ChipStyle) {
  return (
    <Link
      aria-current={selected ? "true" : undefined}
      className={chipClass({ selected, size, tone }, className)}
      {...props}
    >
      <ChipContent selected={selected} tone={tone}>
        {children}
      </ChipContent>
    </Link>
  );
}

/** Dark outline chip with a remove icon (active filters). */
export function RemovableChip({ children, className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border border-ink bg-white px-3 text-body-sm font-medium whitespace-nowrap hover:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
      <X size={14} strokeWidth={2.5} aria-hidden />
    </Link>
  );
}

/** Area pill with a pin icon. */
export function AreaChip({ children, className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-input bg-white px-4 text-body font-medium whitespace-nowrap transition-colors hover:border-ink lg:h-10",
        className,
      )}
      {...props}
    >
      <MapPin size={15} className="text-muted" aria-hidden />
      {children}
    </Link>
  );
}
