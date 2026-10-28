import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container, PageTitle } from "./container";
import { MobileTopBar } from "./header";

/**
 * A screen opened from another one (the account page's rows): on a phone a top bar with a back arrow and no
 * tab bar, on desktop the usual page title. Grey page, white cards, like the account page it came from.
 */
export function SubScreen({
  title,
  subtitle,
  backHref = "/account",
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <MobileTopBar title={title} backHref={backHref} />
      <div className="min-h-[calc(100dvh-57px)] bg-surface lg:min-h-0">
        <Container className={cn("flex flex-col gap-6 pt-5 pb-10 lg:gap-8 lg:pt-12 lg:pb-20", className)}>
          <PageTitle title={title} subtitle={subtitle} className="hidden lg:block" />
          {children}
        </Container>
      </div>
    </>
  );
}
