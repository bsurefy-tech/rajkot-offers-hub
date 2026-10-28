import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/components/i18n/link";
import { cn } from "@/lib/utils";

/** A grouped list on a grey page: white card, hairline dividers between its rows. */
export function SettingsGroup({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className="mb-2 px-1 text-caption font-semibold tracking-[0.08em] text-muted uppercase">{title}</h2>}
      <div className="overflow-hidden rounded-2xl border border-line bg-white [&>*+*]:border-t [&>*+*]:border-line">{children}</div>
    </section>
  );
}

interface RowProps {
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  /** A pill on the right (a count of new things). */
  badge?: ReactNode;
  tone?: "default" | "danger";
  /** Plain action rows (sign out) have no arrow. */
  arrow?: boolean;
  className?: string;
}

const rowClass = "flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface";

function RowBody({ icon: Icon, title, hint, badge, tone = "default", arrow = true }: RowProps) {
  return (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", tone === "danger" ? "bg-danger/10 text-danger" : "bg-primary-soft text-primary")}>
        <Icon size={20} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-body leading-snug font-semibold", tone === "danger" && "text-danger")}>{title}</span>
        {hint && <span className="mt-0.5 block text-body-sm leading-snug text-muted">{hint}</span>}
      </span>
      {badge}
      {arrow && <ChevronRight size={18} className="shrink-0 text-faint" aria-hidden />}
    </>
  );
}

/** One row: a link, or (with `onClick` or as a form button) an action. */
export function SettingsLink({ href, ...props }: RowProps & { href: string }) {
  return (
    <Link href={href} className={cn(rowClass, props.className)}>
      <RowBody {...props} />
    </Link>
  );
}

export function SettingsButton({ onClick, type = "button", ...props }: RowProps & { onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button type={type} onClick={onClick} className={cn(rowClass, props.className)}>
      <RowBody {...props} />
    </button>
  );
}

/** The small pink count pill on a row. */
export function RowBadge({ children }: { children: ReactNode }) {
  return <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-caption leading-none font-semibold text-white">{children}</span>;
}
