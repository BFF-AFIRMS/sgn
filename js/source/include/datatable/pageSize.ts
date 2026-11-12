import type { DataTablePageSize } from './types';

/**
 * TanStack Table's `PaginationState.pageSize` is always a number, so "All" is
 * stored as a sentinel.
 *
 * MAX INT is used rather than the current row count so the selection stays
 * put when the data changes.
 */
export const ALL_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

/** Converts a `DataTablePageSize` into the number TanStack Table expects. */
export const resolvePageSize = (size: DataTablePageSize): number =>
    size === 'all' ? ALL_PAGE_SIZE : size;

/** Converts a stored `pageSize` back into the option that represents it. */
export const toPageSizeOption = (pageSize: number): DataTablePageSize =>
    pageSize === ALL_PAGE_SIZE ? 'all' : pageSize;
