import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  /** "plain": rows split by top borders (FAQ). "card": bordered box (terms). */
  variant?: "plain" | "card";
  /** Shared name makes the group behave as "one open at a time". */
  name?: string;
  className?: string;
}

/** Native <details>, so it works without JavaScript. */
export function AccordionItem({
  title,
  children,
  defaultOpen,
  variant = "plain",
  name,
  className,
}: AccordionItemProps) {
  return (
    <details
      name={name}
      open={defaultOpen}
      className={cn(
        "group",
        variant === "plain" && "border-t border-line last:border-b",
        variant === "card" && "rounded-2xl border border-line",
        className,
      )}
    >
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden",
          variant === "plain" && "py-[18px] text-heading font-semibold lg:py-[22px]",
          variant === "card" && "px-[18px] py-4 text-title font-semibold",
        )}
      >
        {title}
        <ChevronDown
          aria-hidden
          className="size-[18px] shrink-0 text-muted transition-transform group-open:rotate-180 lg:size-5"
        />
      </summary>
      <div
        className={cn(
          variant === "plain" &&
            "pr-[34px] pb-[18px] text-body-sm leading-relaxed text-muted lg:max-w-[640px] lg:pr-0 lg:pb-[22px]",
          variant === "card" && "px-[18px] pb-[18px]",
        )}
      >
        {children}
      </div>
    </details>
  );
}
