import React from 'react';

export interface DataTablePaginationProps {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    pageSizeOptions: Array<number>;
    selectedRowCount: number;
    totalRowCount: number;
    canPreviousPage: boolean;
    canNextPage: boolean;
    onPageSizeChange: (pageSize: number) => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
}

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
    // Keep the active page size selectable even when it is not one of the presets.
    const sizes = pageSizeOptions.includes(pageSize)
        ? pageSizeOptions
        : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

    return (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:text-[13px]">
            <span className="tw:text-[#666]">
                {selectedRowCount} of {totalRowCount} row(s) selected.
            </span>
            <div className="tw:flex tw:items-center tw:gap-2">
                <span>Rows per page</span>
                <select
                    className="form-control tw:h-[30px]! tw:w-auto! tw:px-2! tw:py-0.5!"
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={event => onPageSizeChange(Number(event.target.value))}
                >
                    {sizes.map(size => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    className="btn btn-default btn-sm"
                    disabled={!canPreviousPage}
                    onClick={onPreviousPage}
                >
                    &laquo; Previous
                </button>
                <span className="tw:min-w-16 tw:text-center">
                    {pageIndex + 1} / {Math.max(pageCount, 1)}
                </span>
                <button
                    type="button"
                    className="btn btn-default btn-sm"
                    disabled={!canNextPage}
                    onClick={onNextPage}
                >
                    Next &raquo;
                </button>
            </div>
        </div>
    );
};
