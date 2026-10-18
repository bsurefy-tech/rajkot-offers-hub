import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Native checkbox drawn as the design's 20px box. */
export function Checkbox({
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-body text-ink", className)}>
      <span className="relative flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-md border-[1.5px] border-line-strong bg-white transition-colors checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          {...props}
        />
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** Dark checkbox used in the offer filters. */
export function FilterCheckbox({
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-body text-ink", className)}>
      <span className="relative flex size-5 shrink-0">
        <input
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-md border-[1.5px] border-line-strong bg-white checked:border-ink checked:bg-ink"
          {...props}
        />
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span>{label}</span>
    </label>
  );
}

export function Radio({
  label,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 text-body text-ink", className)}>
      <input
        type="radio"
        className="size-5 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-line-strong bg-white checked:border-[6px] checked:border-ink"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
