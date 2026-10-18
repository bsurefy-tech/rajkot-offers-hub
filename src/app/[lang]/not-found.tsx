import { Footer } from "@/components/layout/footer";
import { DesktopHeader, MobileHeader } from "@/components/layout/header";
import { ButtonLink } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <>
      <DesktopHeader />
      <MobileHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-8 pt-10 pb-14 text-center lg:min-h-[560px] lg:p-20">
        <p aria-hidden className="text-[72px] leading-none font-semibold tracking-[-0.03em] text-input lg:text-[120px]">
          404
        </p>
        <h1 className="mt-4 text-page font-semibold">{t("Page not found")}</h1>
        <p className="mt-3 max-w-[520px] text-body leading-relaxed text-muted">
          {t("The link may have changed, or the page may no longer be available.")}
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 lg:w-auto lg:flex-row">
          <ButtonLink href="/" className="lg:px-7">
            {t("Go to home")}
          </ButtonLink>
          <ButtonLink href="/offers" variant="outline" className="lg:px-7">
            {t("Browse offers")}
          </ButtonLink>
        </div>
      </main>
      <Footer />
    </>
  );
}
