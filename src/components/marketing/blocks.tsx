import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StepCardProps {
  n: number;
  icon: LucideIcon;
  title: string;
  text: string;
}

/** Numbered step: a row on mobile, a tall card on desktop. */
export function StepCard({ n, icon: Icon, title, text }: StepCardProps) {
  return (
    <li className="relative flex gap-4 rounded-2xl border border-line bg-white p-5 lg:flex-col lg:p-7">
      <span aria-hidden className="w-9 shrink-0 text-display leading-none font-semibold text-input lg:absolute lg:top-6 lg:right-7 lg:w-auto">
        {n}
      </span>
      <div className="flex flex-col gap-2 lg:gap-4">
        <Icon size={24} strokeWidth={1.6} aria-hidden />
        <h3 className="text-heading font-semibold">{title}</h3>
        <p className="text-body-sm leading-normal text-muted">{text}</p>
      </div>
    </li>
  );
}

export function PromiseItem({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <li className="flex gap-4 lg:flex-col">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white lg:size-12">
        <Icon size={22} strokeWidth={1.6} aria-hidden />
      </span>
      <div>
        <h3 className="text-heading font-semibold">{title}</h3>
        <p className="mt-1 text-body-sm leading-normal text-muted">{text}</p>
      </div>
    </li>
  );
}

/** Centred success panel (form submitted). */
export function SuccessPanel({
  icon: Icon,
  title,
  text,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex min-h-[460px] flex-col items-center justify-center px-6 py-12 text-center lg:min-h-[560px]">
      <span className="flex size-24 items-center justify-center rounded-full bg-success-soft text-success">
        <Icon size={44} strokeWidth={2} aria-hidden />
      </span>
      <h2 className="mt-6 text-page font-semibold">{title}</h2>
      <p className="mt-2 max-w-sm text-body-sm leading-relaxed text-muted">{text}</p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">{actions}</div>
    </div>
  );
}
