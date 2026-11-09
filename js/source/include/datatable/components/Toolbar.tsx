import React, { useEffect, useRef, useState } from 'react';
import type { Table } from '@tanstack/react-table';

import type { DataTableFeatures } from '../features';
import type { DataTableProps } from '../types';

interface DataTableToolbarProps<TData> {
    table: Table<DataTableFeatures, TData>;
    toolbar: DataTableProps<TData>['toolbar'];
    columnLabels: Record<string, string>;
    globalFilter?: {
        value: string;
        onChange: (value: string) => void;
    };
}

export function DataTableToolbar<TData extends Record<string, any>>({
    table,
    toolbar,
    columnLabels,
    globalFilter,
}: DataTableToolbarProps<TData>) {
    const toolbarContent = typeof toolbar === 'function' ? toolbar(table) : toolbar;

    return (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
            {globalFilter && (
                <input
                    type="search"
                    className="form-control tw:w-[220px]!"
                    placeholder="Search all columns..."
                    aria-label="Search all columns"
                    value={globalFilter.value}
                    onChange={event => globalFilter.onChange(event.target.value)}
                />
            )}
            <ColumnVisibilityMenu table={table} columnLabels={columnLabels} />
            {toolbarContent}
        </div>
    );
}

interface ColumnVisibilityMenuProps<TData> {
    table: Table<DataTableFeatures, TData>;
    columnLabels: Record<string, string>;
}

function ColumnVisibilityMenu<TData extends Record<string, any>>({
    table,
    columnLabels,
}: ColumnVisibilityMenuProps<TData>) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const handleMouseDown = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [open]);

    const hideableColumns = table.getAllLeafColumns().filter(column => column.getCanHide());

    return (
        <div className="tw:relative tw:inline-block" ref={containerRef}>
            <button
                type="button"
                className="btn btn-default"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen(value => !value)}
            >
                Column Visibility <span className="caret" />
            </button>
            {open && (
                <div className="dropdown-menu tw:block! tw:max-h-80 tw:overflow-y-auto">
                    {hideableColumns.length === 0 ? (
                        <span className="tw:block tw:px-4 tw:py-1 tw:whitespace-nowrap tw:text-[#888]">
                            No hideable columns
                        </span>
                    ) : (
                        hideableColumns.map(column => (
                            <label
                                key={column.id}
                                className="tw:m-0! tw:block! tw:cursor-pointer tw:px-4 tw:py-1 tw:font-normal! tw:whitespace-nowrap"
                            >
                                <input
                                    type="checkbox"
                                    checked={column.getIsVisible()}
                                    onChange={column.getToggleVisibilityHandler()}
                                />{' '}
                                {columnLabels[column.id] ?? column.id}
                            </label>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
