import {
    columnFilteringFeature,
    columnVisibilityFeature,
    createFilteredRowModel,
    createPaginatedRowModel,
    createSortedRowModel,
    filterFn_includesString,
    filterFn_inNumberRange,
    globalFilteringFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_basic,
    sortFn_datetime,
    sortFn_text,
    tableFeatures,
} from '@tanstack/react-table';

/**
 * Static feature set shared by every `<DataTable />`.
 *
 * Kept at module scope (instead of being built inside the component) so the
 * reference is stable across renders; TanStack Table memoizes the column and
 * row-model structures against it.
 *
 * Only the functions that can be resolved *by name* are registered:
 * `sortFn: 'auto'` (the default) resolves to `alphanumeric`, `text`, `basic`
 * or `datetime` depending on the column's data, and the default column and
 * global filter resolve to `includesString`.
 */
export const dataTableFeatures = tableFeatures({
    rowSortingFeature,
    columnFilteringFeature,
    globalFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    rowSelectionFeature,
    sortedRowModel: createSortedRowModel(),
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    sortFns: {
        alphanumeric: sortFn_alphanumeric,
        text: sortFn_text,
        basic: sortFn_basic,
        datetime: sortFn_datetime,
    },
    filterFns: {
        includesString: filterFn_includesString,
        inNumberRange: filterFn_inNumberRange,
    },
});

export type DataTableFeatures = typeof dataTableFeatures;
