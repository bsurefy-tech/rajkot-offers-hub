import type { Metadata } from "next";
import {
  AreaPills,
  CategoryBanner,
  CategoryImageGrid,
  categoryHref,
} from "@/components/categories/category-tiles";
import { Container, PageTitle } from "@/components/layout/container";
import { MobileTopBar } from "@/components/layout/header";
import { getAreas, getCategories } from "@/lib/data";
import { offersPath } from "@/lib/areas";
import { formatOfferCount } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { collectionLd, JsonLd, pageMetadata } from "@/lib/seo";
import { resolveArea } from "./resolve-area";

export async function categoriesMetadata(): Promise<Metadata> {
  const t = await getT();
  // Area versions only change the counts, so they all point to "/categories".
  return pageMetadata({
    title: t("Offer categories in Rajkot"),
    description: t("Find Rajkot's offers by category: food, fashion, beauty and more."),
    path: "/categories",
  });
}

/** The category list for all of Rajkot, or with one area's counts when `area` comes from the URL. */
export async function CategoriesView({ area: areaSlug }: { area?: string }) {
  const t = await getT();
  const area = await resolveArea(areaSlug);
  const categories = await getCategories(area?.slug);
  const featured = categories.find((c) => c.featured);
  const grid = categories.filter((c) => !c.featured);

  const description = t("Find Rajkot's offers by category: food, fashion, beauty and more.");

  return (
    <>
      <MobileTopBar title={t("Categories")} backHref="/" />
      <Container className="flex flex-col gap-8 pt-5 pb-10 lg:gap-14 lg:pt-12 lg:pb-20">
        <JsonLd
          data={await collectionLd({
            name: t("Offer categories in Rajkot"),
            description,
            path: "/categories",
            items: categories.map((c) => ({ name: c.name, path: offersPath(undefined, c.slug), image: c.image })),
          })}
        />
        <PageTitle title={t("Offer categories in Rajkot")} subtitle={t("What are you looking for? Pick a category")} className="hidden lg:block" />

        {featured && (
          <CategoryBanner
            eyebrow={t("This season")}
            title={featured.name}
            description={featured.description}
            image={featured.image}
            href={categoryHref(featured.slug)}
            cta={formatOfferCount(featured.offerCount, t)}
          />
        )}

        <CategoryImageGrid categories={grid} />

        <section id="areas" className="scroll-mt-20">
          <h2 className="mb-4 text-page font-semibold lg:mb-6">{t("Browse by area")}</h2>
          <AreaPills areas={await getAreas()} />
        </section>
      </Container>
    </>
  );
}

