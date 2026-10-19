import { SearchX } from "lucide-react";
import type { BusinessFilters, BusinessSortKey, BusinessSummary, Paged } from "@/types";
import { StickyChips } from "@/components/offers/sticky-chips";
import { SearchBar } from "@/components/marketing/search-bar";
import { ButtonLink } from "@/components/ui/button";
import { ChipMenu, type ChipMenuOption } from "@/components/ui/chip-menu";
import { RemovableChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/display";
import { BUSINESS_SORT_OPTIONS, businessFiltersToQuery } from "@/lib/business-filters";
import { getT } from "@/lib/i18n/server";
import type { Area, Category } from "@/types";
import { BusinessResults } from "./business-results";

interface BusinessesExplorerProps {
  basePath: string;
  filters: BusinessFilters;
  result: Paged<BusinessSummary>;
  categories: Pick<Category, "slug" | "shortName">[];
  areas: Area[];
}

/** Search, filter chips (category, area, sort) and the shops, laid out like the offers list. */
export async function BusinessesExplorer({ basePath, filters, result, categories, areas }: BusinessesExplorerProps) {
  const t = await getT();
  const href = (patch: Partial<BusinessFilters> = {}) => `${basePath}${businessFiltersToQuery(filters, patch)}`;
  // "Nearest" without a location lists the default order (see `getBusinesses`), so say that.
  const sort: BusinessSortKey = filters.sort === "nearest" && !filters.near ? "recommended" : (filters.sort ?? "recommended");

  const choice = (all: string, current: string | undefined, options: { value: string; label: string }[], patchOf: (value: string | undefined) => Partial<BusinessFilters>): ChipMenuOption[] => [
    { key: "", label: all, selected: !current, href: href(patchOf(undefined)) },
    ...options.map((option) => ({ key: option.value, label: option.label, selected: current === option.value, href: href(patchOf(option.value)) })),
  ];
  const categoryOptions = choice(t("All"), filters.category, categories.map((c) => ({ value: c.slug, label: c.shortName })), (category) => ({ category }));
  const areaOptions = choice(t("All"), filters.area, areas.map((a) => ({ value: a.slug, label: a.name })), (area) => ({ area }));
  const sortOptions: ChipMenuOption[] = BUSINESS_SORT_OPTIONS.map((option) =>
    option.value === "nearest" && !filters.near
      ? { key: option.value, label: t(option.label), selected: false, pickLocation: true }
      : { key: option.value, label: t(option.label), selected: sort === option.value, href: href({ sort: option.value }) },
  );

  const chosen = (options: ChipMenuOption[], current: string | undefined) => (current ? options.find((o) => o.selected)?.label : undefined);
  const chipRow = (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
      <ChipMenu label={t("Category")} options={categoryOptions} value={chosen(categoryOptions, filters.category)} />
      <ChipMenu label={t("Area")} options={areaOptions} value={chosen(areaOptions, filters.area)} />
      <ChipMenu label={t("Sort")} options={sortOptions} value={sort !== "recommended" ? sortOptions.find((o) => o.selected)?.label : undefined} />
    </div>
  );

  const anyFilter = Boolean(filters.q || filters.category || filters.area);
  const hasResults = result.items.length > 0;
  // Nothing to narrow down: no shops and no filter or search applied.
  const nothingYet = !hasResults && !anyFilter;

  const clearAll = (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters.q && (
        <RemovableChip href={href({ q: undefined })} scroll={false}>
          {`“${filters.q}”`}
        </RemovableChip>
      )}
      <ButtonLink href={basePath} scroll={false} variant="ghost" size="sm" className="h-[34px] px-2 text-body-sm">
        {t("Clear all")}
      </ButtonLink>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* On a phone only the chips stay under the header while the list scrolls; the search scrolls away. */}
      {!nothingYet && (
        <div className="-mb-4 pt-3 lg:hidden">
          <SearchBar defaultValue={filters.q} action={basePath} placeholder={t("Search for a shop")} />
        </div>
      )}
      {!nothingYet && <StickyChips>{chipRow}</StickyChips>}
      <div>
        {hasResults ? (
          <>
            {anyFilter && clearAll}
            <BusinessResults
              // A new list starts from its first page, so a changed filter remounts it.
              key={`${basePath}${businessFiltersToQuery(filters)}`}
              query={{ q: filters.q, category: filters.category, area: filters.area, sort: filters.sort }}
              initialItems={result.items}
              initialPage={result.page}
              initialHasMore={result.hasMore}
              nextHref={href({ page: result.page + 1 })}
            />
          </>
        ) : (
          <>
            {anyFilter && clearAll}
            <EmptyState
              icon={SearchX}
              title={t("No shops found")}
              hint={anyFilter ? t("Change the filters and try again") : t("Shops will show up here soon.")}
              action={
                anyFilter ? (
                  <ButtonLink href={basePath} variant="outline" className="h-11">
                    {t("Reset filters")}
                  </ButtonLink>
                ) : undefined
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
