"use client";

import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

interface FieldProps {
  id: string;
  label: ReactNode;
  optional?: boolean;
  helper?: ReactNode;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Label, control, helper text and error message. */
export function Field({ id, label, optional, helper, error, className, children }: FieldProps) {
  const t = useT();
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-body font-medium text-ink">
          {label}
        </label>
        {optional && <span className="text-caption text-faint">{t("Optional")}</span>}
      </div>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        helper && (
          <p id={`${id}-helper`} className="text-caption leading-[1.4] text-muted">
            {helper}
          </p>
        )
      )}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-body-sm text-danger">
      <CircleAlert size={14} aria-hidden className="shrink-0" />
      {children}
    </p>
  );
}

/** ARIA props that link a control to its field's helper or error text. */
export function describedBy(id: string, { error, helper }: { error?: string; helper?: unknown }) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : helper ? `${id}-helper` : undefined,
  } as const;
}
