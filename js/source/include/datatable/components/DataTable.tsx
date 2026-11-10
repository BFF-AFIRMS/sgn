import React, { useMemo, useState } from 'react';
import {
    flexRender,
    useTable,
    type ColumnDef,
    type ColumnFiltersState,
    type ColumnVisibilityState,
    type PaginationState,
    type RowSelectionState,
    type SortingState,
} from '@tanstack/react-table';

import { dataTableFeatures } from '../features';
import type { DataTableProps } from '../types';
import { DataTablePagination } from './Pagination';
import { DataTableRowActions } from './RowActions';
import { DataTableToolbar } from './Toolbar';
import { TextInput } from '~/@generic/components/Input';

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

// Synthetic column ids for the two columns that are not driven by the `columns`
// prop. They are also used as keys into `columnStyles`.
const SELECT_COLUMN_ID = '__select';
const ACTIONS_COLUMN_ID = '__actions';

const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return '';
    }
    if (value instanceof Date) {
        return value.toLocaleDateString();
    }
    return String(value);
};

export function DataTable<TData extends Record<string, any>>({
    columns,
    rows,
    pageSize = 10,
    pageSizeOptions = DEFAULT_PAGE_SIZES,
    sortable = true,
    limitHeight,
    filter,
    getRowId,
    enableRowSelection = true,
    rowActions,
    toolbar,
    emptyMessage = 'No rows found.',
}: DataTableProps<TData>) {
    // All state slices are controlled here so the toolbar, the filter row and
    // the footer all read from a single source of truth.
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const columnLabels = useMemo(() => {
        const labels: Record<string, string> = {};
        columns.forEach(column => {
            labels[column.key] = column.label;
        });
        return labels;
    }, [columns]);

    const columnStyles = useMemo(() => {
        const styles: Record<string, React.CSSProperties> = {
            [SELECT_COLUMN_ID]: { width: '40px', textAlign: 'center' },
            [ACTIONS_COLUMN_ID]: { width: '48px', textAlign: 'center' },
        };
        columns.forEach(column => {
            const style: React.CSSProperties = {};
            if (column.width) {
                style.width = column.width;
            }
            if (column.align) {
                style.textAlign = column.align;
            }
            if (Object.keys(style).length > 0) {
                styles[column.key] = style;
            }
        });
        return styles;
    }, [columns]);

    const tableColumns = useMemo<ColumnDef<typeof dataTableFeatures, TData>[]>(() => {
        const defs: ColumnDef<typeof dataTableFeatures, TData>[] = [];

        if (enableRowSelection) {
            defs.push({
                id: SELECT_COLUMN_ID,
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={table.getIsAllRowsSelected()}
                        ref={element => {
                            if (element) {
                                element.indeterminate =
                                    table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected();
                            }
                        }}
                        onChange={table.getToggleAllRowsSelectedHandler()}
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        ref={element => {
                            if (element) {
                                element.indeterminate = row.getIsSomeSelected();
                            }
                        }}
                        onChange={row.getToggleSelectedHandler()}
                    />
                ),
                enableSorting: false,
                enableColumnFilter: false,
                enableHiding: false,
            });
        }

        columns.forEach(column => {
            const cellRenderer = column.cell;
            defs.push({
                id: column.key,
                accessorFn: (row: TData) => row[column.key],
                header: column.label,
                enableSorting: sortable && column.enableSorting !== false,
                enableColumnFilter: filter?.column !== false && column.enableFiltering !== false,
                enableHiding: column.enableHiding !== false,
                cell: cellRenderer
                    ? info => cellRenderer(info)
                    : info => formatCellValue(info.getValue()),
            });
        });

        if (rowActions && rowActions.length > 0) {
            defs.push({
                id: ACTIONS_COLUMN_ID,
                header: '',
                enableSorting: false,
                enableColumnFilter: false,
                enableHiding: false,
                cell: ({ row }) => <DataTableRowActions actions={rowActions} row={row.original} />,
            });
        }

        return defs;
    }, [columns, enableRowSelection, filter, rowActions, sortable]);

    const table = useTable({
        features: dataTableFeatures,
        columns: tableColumns,
        data: rows,
        getRowId,
        enableRowSelection,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            columnVisibility,
            pagination,
            rowSelection,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
    });

    const headerGroups = table.getHeaderGroups();
    // The generated columns always produce a single header row, so the first
    // group's headers line up one-to-one with the filter inputs below them.
    const filterHeaders = headerGroups[0]?.headers ?? [];
    const showFilterRow = filter?.column !== false;

    return (
        <div className="tw:flex tw:flex-col tw:gap-2">
            <DataTableToolbar
                table={table}
                toolbar={toolbar}
                columnLabels={columnLabels}
                globalFilter={
                    filter?.global
                        ? { value: globalFilter, onChange: value => setGlobalFilter(value) }
                        : undefined
                }
            />

            <div
                className="tw:overflow-auto"
                style={limitHeight ? { maxHeight: limitHeight } : undefined}
            >
                <table className="table table-hover tw:mb-0">
                    <thead className="tw:sticky tw:top-0 tw:z-2">
                        {headerGroups.map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    const canSort = header.column.getCanSort();
                                    const sorted = header.column.getIsSorted();
                                    const label =
                                        columnLabels[header.column.id] ?? header.column.id;

                                    return (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            style={columnStyles[header.column.id]}
                                            className={[
                                                'tw:bg-[#f5f5f5] tw:align-middle tw:whitespace-nowrap',
                                                canSort
                                                    ? 'tw:cursor-pointer tw:select-none tw:hover:bg-[#eaeaea]'
                                                    : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            title={canSort ? `Sort by ${label}` : undefined}
                                            onClick={
                                                canSort
                                                    ? header.column.getToggleSortingHandler()
                                                    : undefined
                                            }
                                        >
                                            {header.isPlaceholder ? null : (
                                                <>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {canSort && (
                                                        <span
                                                            className={`tw:ml-1.5 tw:text-[11px] ${
                                                                sorted
                                                                    ? 'tw:text-[#333]'
                                                                    : 'tw:text-[#b0b0b0]'
                                                            }`}
                                                        >
                                                            {sorted === 'asc'
                                                                ? '▲'
                                                                : sorted === 'desc'
                                                                  ? '▼'
                                                                  : '⇅'}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                        {showFilterRow && (
                            <tr>
                                {filterHeaders.map(header => (
                                    <th
                                        key={`filter-${header.id}`}
                                        style={columnStyles[header.column.id]}
                                        className="tw:bg-white tw:px-2 tw:py-2 tw:border-0"
                                    >
                                        {header.column.getCanFilter() ? (
                                            <TextInput
                                                type="search"
                                                placeholder="..."
                                                aria-label={`Filter ${
                                                    columnLabels[header.column.id] ??
                                                    header.column.id
                                                }`}
                                                value={String(
                                                    header.column.getFilterValue() ?? '',
                                                )}
                                                onChange={event =>
                                                    header.column.setFilterValue(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        ) : null}
                                    </th>
                                ))}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    className="tw:py-6 tw:text-center tw:text-[#888]"
                                    colSpan={table.getVisibleLeafColumns().length}
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            style={columnStyles[cell.column.id]}
                                            className={
                                                row.getIsSelected()
                                                    ? 'tw:bg-[#eef5ff]'
                                                    : undefined
                                            }
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DataTablePagination
                pageIndex={pagination.pageIndex}
                pageSize={pagination.pageSize}
                pageCount={table.getPageCount()}
                pageSizeOptions={pageSizeOptions}
                selectedRowCount={table.getSelectedRowModel().rows.length}
                totalRowCount={table.getPrePaginatedRowModel().rows.length}
                canPreviousPage={table.getCanPreviousPage()}
                canNextPage={table.getCanNextPage()}
                onPageSizeChange={size => table.setPageSize(size)}
                onPreviousPage={() => table.previousPage()}
                onNextPage={() => table.nextPage()}
            />
        </div>
    );
}
