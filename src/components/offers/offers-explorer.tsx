import { SearchX } from "lucide-react";
import type { ReactNode } from "react";
import type { OfferFilters, OfferSummary, Paged, SortKey } from "@/types";
import { SearchBar } from "@/components/marketing/search-bar";
import { ButtonLink } from "@/components/ui/button";
import { ChipMenu, type ChipMenuOption } from "@/components/ui/chip-menu";
import { RemovableChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/display";
import { OFFER_TYPES, SORT_OPTIONS, VALIDITY_OPTIONS, filtersToQuery } from "@/lib/filters";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { OfferResults } from "./offer-results";
import { StickyChips } from "./sticky-chips";
import { FloatingViewToggle, ViewProvider, ViewToggle } from "./view-toggle";

export interface ChipOption {
  label: string;
  /** The filter patch this option applies. */
  patch?: Partial<OfferFilters>;
  /** Link to use instead of applying `patch` to the current page (e.g. another category's path). */
  href?: string;
  selected: boolean;
}

interface OffersExplorerProps {
  /** "/offers" or "/categories/<slug>"; links add the visitor's area automatically. */
  basePath: string;
  /** The category the list is for, when the path names one. */
  category?: string;
  filters: OfferFilters;
  result: Paged<OfferSummary>;
  /** What the first filter chip chooses between: another category, or a sub-category. The first option means "all". */
  scope: { label: string; options: ChipOption[] };
  /** Show the search box on a phone (the offers page also has one beside its title on desktop). */
  withSearch?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: { href: string; label: string };
  /** Shown under the empty state when nothing is filtered (the list is empty because there is nothing yet). */
  emptySuggestions?: ReactNode;
}

/** Search, filter chips (category, offer type, validity, sort), and the offers as a list or on a map. */
export async function OffersExplorer({
  basePath,
  category,
  filters,
  result,
  scope,
  withSearch,
  emptyTitle,
  emptyHint,
  emptyAction,
  emptySuggestions,
}: OffersExplorerProps) {
  const t = await getT();
  const href = (patch: Partial<OfferFilters> = {}) => `${basePath}${filtersToQuery(filters, patch)}`;
  // "Nearest" without a location lists the newest (see `getOffers`), so say that.
  const sort: SortKey = filters.sort === "nearest" && !filters.near ? "newest" : (filters.sort ?? "newest");

  const scopeOptions: ChipMenuOption[] = scope.options.map((option, i) => ({
    key: String(i),
    label: option.label,
    selected: option.selected,
    href: option.href ?? href(option.patch),
  }));
  const scopeValue = scope.options.findIndex((option) => option.selected);

  const choice = <V extends string>(options: { value: V; label: string }[], current: V | undefined, patchOf: (value: V | undefined) => Partial<OfferFilters>, any: string) => [
    { key: "", label: any, selected: !current, href: href(patchOf(undefined)) },
    ...options.map((option) => ({ key: option.value, label: option.label, selected: current === option.value, href: href(patchOf(option.value)) })),
  ];
  const typeOptions = choice(OFFER_TYPES.map((o) => ({ ...o, label: t(o.label) })), filters.type, (type) => ({ type }), t("All"));
  const validityOptions = choice(VALIDITY_OPTIONS.map((o) => ({ ...o, label: t(o.label) })), filters.validity, (validity) => ({ validity }), t("Any"));
  const sortOptions: ChipMenuOption[] = SORT_OPTIONS.map((option) =>
    option.value === "nearest" && !filters.near
      ? { key: option.value, label: t(option.label), selected: false, pickLocation: true }
      : { key: option.value, label: t(option.label), selected: sort === option.value, href: href({ sort: option.value }) },
  );

  const chipRow = (
    <div className={cn("no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4", "lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0")}>
      {scope.options.length > 1 && (
        <ChipMenu label={scope.label} options={scopeOptions} value={scopeValue > 0 ? scope.options[scopeValue].label : undefined} />
      )}
      <ChipMenu label={t("Offer type")} options={typeOptions} value={filters.type ? typeOptions.find((o) => o.selected)?.label : undefined} />
      <ChipMenu label={t("Validity")} options={validityOptions} value={filters.validity ? validityOptions.find((o) => o.selected)?.label : undefined} />
      <ChipMenu label={t("Sort")} options={sortOptions} value={sort !== "newest" ? sortOptions.find((o) => o.selected)?.label : undefined} />
    </div>
  );

  const anyFilter = Boolean(filters.q || filters.type || filters.validity);
  const hasResults = result.items.length > 0;
  // Nothing to narrow down: no offers and no filter or search applied (a sub-category is a filter too).
  const nothingYet = !hasResults && !anyFilter && !filters.subcategory;
  const results = result.items.length ? (
    <>
      {anyFilter && (
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
      )}
      <OfferResults
        // A new list starts from its first page, so a changed filter remounts it.
        key={`${basePath}${filtersToQuery(filters)}`}
        query={{
          area: filters.areas?.[0],
          category,
          q: filters.q,
          sub: filters.subcategory,
          type: filters.type,
          validity: filters.validity,
          sort: filters.sort,
        }}
        initialItems={result.items}
        initialPage={result.page}
        initialHasMore={result.hasMore}
        total={result.total}
        nextHref={href({ page: result.page + 1 })}
        mapHeader={
          <>
            {withSearch && <SearchBar defaultValue={filters.q} action={basePath} />}
            {chipRow}
          </>
        }
      />
    </>
  ) : (
    <>
      {anyFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ButtonLink href={basePath} scroll={false} variant="ghost" size="sm" className="h-[34px] px-2 text-body-sm">
            {t("Clear all")}
          </ButtonLink>
        </div>
      )}
      <EmptyState
        icon={SearchX}
        title={emptyTitle ?? t("No offers found")}
        hint={emptyHint ?? t("Change the filters and try again")}
        action={
          <ButtonLink href={emptyAction?.href ?? basePath} variant="outline" className="h-11">
            {emptyAction?.label ?? t("Reset filters")}
          </ButtonLink>
        }
      />
      {nothingYet && emptySuggestions}
    </>
  );

  return (
    <ViewProvider>
      <div className="flex flex-col gap-4 lg:gap-6">
        {/* On a phone only the chips stay under the header while the list scrolls; the search scrolls away. */}
        {!nothingYet && withSearch && (
          <div className="-mb-4 pt-3 lg:hidden">
            <SearchBar defaultValue={filters.q} action={basePath} />
          </div>
        )}
        {!nothingYet && (
          <StickyChips>
            {/* On desktop the switch ends the chip row; on a phone it floats above the bottom menu. */}
            <div className="lg:flex lg:items-start lg:justify-between lg:gap-4">
              {chipRow}
              {hasResults && <ViewToggle className="hidden lg:flex" />}
            </div>
          </StickyChips>
        )}
        <div>{results}</div>
      </div>
      {hasResults && <FloatingViewToggle />}
    </ViewProvider>
  );
}
