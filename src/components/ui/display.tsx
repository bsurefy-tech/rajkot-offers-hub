import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-skeleton", className)} {...props} />;
}

/** A line of text `height` tall, drawn as a shorter bar in the middle of it. */
export function TextLineSkeleton({ height, bar = 14, className }: { height: number; bar?: number; className?: string }) {
  return (
    <div className="flex items-center" style={{ height }}>
      <Skeleton className={className} style={{ height: bar }} />
    </div>
  );
}

/** `PageTitle`: a 28px (40px on desktop) heading with an optional line under it. */
export function PageTitleSkeleton({ subtitle = true, center }: { subtitle?: boolean; center?: boolean }) {
  return (
    <div className={cn(center && "flex flex-col items-center")}>
      <Skeleton className="h-[35px] w-48 lg:h-12 lg:w-72" />
      {subtitle && <Skeleton className="mt-1.5 h-[22px] w-64 max-w-full lg:mt-2 lg:h-[26px] lg:w-96" />}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Circle size: 64 (md) or 72 (lg). */
  size?: "md" | "lg";
  className?: string;
}

export function EmptyState({ icon: Icon, title, hint, action, size = "lg", className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div
        className={cn(
          "mb-5 flex items-center justify-center rounded-full bg-surface text-faint",
          size === "lg" ? "size-[72px]" : "size-16",
        )}
      >
        <Icon size={size === "lg" ? 30 : 26} strokeWidth={1.6} aria-hidden />
      </div>
      <h2 className="text-heading font-semibold">{title}</h2>
      {hint && <p className="mt-2 max-w-xs text-body-sm leading-relaxed text-muted">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface DetailRowProps {
  icon: LucideIcon | ((props: { size?: number }) => ReactNode);
  label: string;
  children: ReactNode;
  className?: string;
}

/** Icon, small label and value, used for offer and business details. */
export function DetailRow({ icon: Icon, label, children, className }: DetailRowProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <span className="mt-0.5 shrink-0 text-muted">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <div className="text-caption text-muted">{label}</div>
        <div className="mt-0.5 text-body leading-normal font-medium break-words">{children}</div>
      </div>
    </div>
  );
}

interface StepperProps {
  title: string;
  step: number;
  total: number;
  /** Translated "Step x of y" text. */
  stepLabel: string;
  /** Step names shown under the bar on desktop. */
  labels?: string[];
}

export function Stepper({ title, step, total, stepLabel, labels }: StepperProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-heading font-semibold">{title}</h2>
        <span className="text-body-sm whitespace-nowrap text-muted">
          {stepLabel}
        </span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
        aria-label={title}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
      {labels && (
        <ol className="hidden justify-between text-body-sm font-medium lg:flex">
          {labels.map((label, i) => (
            <li key={label} className={i + 1 === step ? "text-primary" : "text-faint"}>
              {label}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Small uppercase-style label above a section title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-body-sm font-semibold text-primary", className)}>{children}</p>;
}
