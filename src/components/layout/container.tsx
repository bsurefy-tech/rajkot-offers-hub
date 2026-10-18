import { Link } from "@/components/i18n/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

/** 1200px content column with 16px gutters on a phone, 20px on desktop. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-4 lg:px-5", className)} {...props} />;
}

interface SectionProps extends ComponentProps<"section"> {
  tone?: "white" | "surface";
  /** Use the tighter page padding instead of the 80px desktop section padding. */
  compact?: boolean;
}

export function Section({ tone = "white", compact, className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        tone === "surface" ? "bg-surface" : "bg-white",
        compact ? "py-8 lg:py-12" : "py-8 lg:py-20",
        className,
      )}
      {...props}
    >
      <Container>{children}</Container>
    </section>
  );
}

interface SectionHeaderProps {
  title: ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
  as?: "h1" | "h2";
}

/** Section title with an optional pink "see all" link. */
export async function SectionHeader({ title, href, linkLabel, className, as: Tag = "h2" }: SectionHeaderProps) {
  const t = await getT();
  return (
    <div className={cn("mb-4 flex items-baseline justify-between gap-4 lg:mb-7", className)}>
      <Tag className="text-page leading-[1.3] font-semibold">{title}</Tag>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
        >
          {linkLabel ?? t("See all")}
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function PageTitle({ title, subtitle, className }: { title: string; subtitle?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h1 className="text-page leading-[1.25] font-semibold lg:leading-[1.2]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-body-sm text-muted lg:mt-2">{subtitle}</p>}
    </div>
  );
}

export async function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  const t = await getT();
  return (
    <nav aria-label={t("Breadcrumb")} className="hidden text-body-sm text-muted lg:block">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-line-strong" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
