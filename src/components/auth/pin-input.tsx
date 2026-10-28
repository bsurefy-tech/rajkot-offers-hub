"use client";

import type { ComponentProps } from "react";
import { controlClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A 6-digit numeric field (MPIN or WhatsApp code), shown as dots for an MPIN. */
export function PinInput({ secret, invalid, className, ...props }: ComponentProps<"input"> & { secret?: boolean; invalid?: boolean }) {
  return (
    <input
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      autoComplete={secret ? "off" : "one-time-code"}
      type={secret ? "password" : "text"}
      className={controlClass(invalid, cn("h-14 px-4 text-center text-page tracking-[0.5em]", className))}
      onInput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ""))}
      {...props}
    />
  );
}
