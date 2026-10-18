import { Calendar, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shared box style for every text-like control. */
export function controlClass(invalid?: boolean, className?: string) {
  return cn(
    "w-full rounded-xl border bg-white text-field text-ink caret-primary transition-[border-color,box-shadow] outline-none",
    "focus:border-primary focus:shadow-ring focus-visible:outline-none",
    invalid
      ? "border-danger shadow-ring-danger focus:border-danger focus:shadow-ring-danger"
      : "border-input",
    className,
  );
}

type Invalid = { invalid?: boolean };

export function Input({ invalid, className, ...props }: ComponentProps<"input"> & Invalid) {
  return <input className={controlClass(invalid, cn("h-12 px-3.5", className))} {...props} />;
}

export function Textarea({ invalid, className, ...props }: ComponentProps<"textarea"> & Invalid) {
  return (
    <textarea
      className={controlClass(
        invalid,
        cn("min-h-[88px] resize-y px-3.5 py-[13px] leading-[1.45]", className),
      )}
      {...props}
    />
  );
}

/** Phone input with a fixed +91 prefix. */
export function PhoneInput({ invalid, className, ...props }: ComponentProps<"input"> & Invalid) {
  return (
    <div
      className={controlClass(
        invalid,
        cn("flex h-12 overflow-hidden focus-within:border-primary focus-within:shadow-ring", className),
      )}
    >
      <span className="flex items-center border-r border-input bg-surface px-3 text-field font-medium">
        +91
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={11}
        className="min-w-0 flex-1 bg-transparent px-3.5 outline-none focus-visible:outline-none"
        {...props}
      />
    </div>
  );
}

/** Native select styled like the other controls. */
export function Select({
  invalid,
  className,
  placeholder,
  children,
  ...props
}: ComponentProps<"select"> & Invalid & { placeholder?: string }) {
  return (
    <div className="relative">
      <select
        className={controlClass(
          invalid,
          cn(
            "h-12 cursor-pointer appearance-none pr-10 pl-3.5 invalid:text-faint has-[option[value='']:checked]:text-faint",
            className,
          ),
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown
        size={18}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function DateInput({ invalid, className, ...props }: ComponentProps<"input"> & Invalid) {
  return (
    <div className="relative">
      <input
        type="date"
        className={controlClass(
          invalid,
          cn(
            "h-12 pr-10 pl-3.5 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
            className,
          ),
        )}
        {...props}
      />
      <Calendar
        size={18}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
