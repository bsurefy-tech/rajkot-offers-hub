import type { ReactNode } from "react";
import { Container } from "@/components/layout/container";
import { getLocale, getT } from "@/lib/i18n/server";

export interface LegalSection {
  title: string;
  body: ReactNode;
}

/** A plain long-text page (privacy policy, terms). The text is English-only. */
export async function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  return (
    <Container className="max-w-3xl py-6 lg:py-14">
      <div className="rounded-2xl border border-line bg-white p-5 lg:p-10">
        <h1 className="text-page font-semibold">{title}</h1>
        <p className="mt-2 text-body-sm text-muted">{t("Last updated: {date}", { date: updated })}</p>
        {locale !== "en" && <p className="mt-3 rounded-xl bg-surface px-4 py-3 text-body-sm text-muted">{t("This page is available in English only.")}</p>}
        <div lang="en" className="mt-6 flex flex-col gap-8 text-body leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-3 [&_ul+p]:mt-3 [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          <div>{intro}</div>
          {sections.map((section, i) => (
            <section key={section.title}>
              <h2 className="mb-2 text-heading font-semibold">
                {i + 1}. {section.title}
              </h2>
              {section.body}
            </section>
          ))}
        </div>
      </div>
    </Container>
  );
}
