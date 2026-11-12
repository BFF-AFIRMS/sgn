import React from 'react';
import { Button } from '~/@generic';
import { Select } from '~/@generic/components/Select';

import { toPageSizeOption } from '../pageSize';
import type { DataTablePageSize } from '../types';

export interface DataTablePaginationProps {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    pageSizeOptions: DataTablePageSize[];
    selectedRowCount: number;
    totalRowCount: number;
    canPreviousPage: boolean;
    canNextPage: boolean;
    onPageSizeChange: (pageSize: DataTablePageSize) => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

/** `'all'` sorts after every numeric size. */
const rankPageSize = (size: DataTablePageSize) =>
    size === 'all' ? Number.POSITIVE_INFINITY : size;

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
    pageIndex,
    pageSize,
    pageCount,
    pageSizeOptions,
    selectedRowCount,
    totalRowCount,
    canPreviousPage,
    canNextPage,
    onPageSizeChange,
    onPreviousPage,
    onNextPage,
}) => {
    const current = toPageSizeOption(pageSize);

    // Keep the active page size selectable even when it is not one of the presets.
    const sizes = pageSizeOptions.includes(current)
        ? pageSizeOptions
        : [...pageSizeOptions, current].sort(
              (a, b) => rankPageSize(a) - rankPageSize(b),
          );

    return (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:mt-2 tw:text-[13px]">
            <span className="tw:text-[#666]">
                {selectedRowCount} of {totalRowCount} row(s) selected.
            </span>
            <div className="tw:flex tw:items-center tw:gap-2">
                <span>Rows per page</span>
                <Select
                    aria-label="Rows per page"
                    value={String(current)}
                    onChange={event =>
                        onPageSizeChange(
                            event.target.value === 'all'
                                ? 'all'
                                : Number(event.target.value),
                        )
                    }
                >
                    {sizes.map(size => (
                        <option key={String(size)} value={String(size)}>
                            {size === 'all' ? 'All' : size}
                        </option>
                    ))}
                </Select>
                <Button
                    variant="default"
                    disabled={!canPreviousPage}
                    onClick={onPreviousPage}
                >
                    &laquo; Previous
                </Button>
                <span className="tw:min-w-16 tw:text-center">
                    {pageIndex + 1} / {Math.max(pageCount, 1)}
                </span>
                <Button
                    variant="default"
                    disabled={!canNextPage}
                    onClick={onNextPage}
                >
                    Next &raquo;
                </Button>
            </div>
        </div>
    );
};
