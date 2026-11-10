import type { ReactNode } from 'react';
import type { Table } from '@tanstack/react-table';

import type { DataTableFeatures } from './features';

/**
 * Minimal shape of the context TanStack Table hands to a column's `cell`
 * renderer. Declared structurally (instead of importing `CellContext`) so the
 * public API only depends on the two members that are actually useful here.
 */
export interface DataTableCellInfo<TData> {
    /** The full row, including the untouched source object (`row.original`). */
    row: { original: TData };
    /** The value produced by the column's accessor. */
    getValue: () => unknown;
}

export interface DataTableColumn<TData extends Record<string, any> = Record<string, any>> {
    /** Property on the row object that supplies the cell value. */
    key: string;
    /** Text used for the header cell and the column visibility menu. */
    label: string;
    /** Optional custom renderer. Defaults to the stringified accessor value. */
    cell?: (info: DataTableCellInfo<TData>) => ReactNode;
    /** CSS width applied to the header and body cells, e.g. `'120px'` / `'30%'`. */
    width?: string;
    align?: 'left' | 'center' | 'right';
    /** Set to `false` to opt this column out of sorting. */
    enableSorting?: boolean;
    /** Set to `false` to opt this column out of the per-column filter row. */
    enableFiltering?: boolean;
    /** Set to `false` to keep this column out of the visibility menu. */
    enableHiding?: boolean;
}

/** One entry of the per-row `...` menu. */
export interface DataTableRowAction<TData> {
    label: string;
    onClick: (row: TData) => void;
    /** `danger` renders the action in red (e.g. Delete). */
    variant?: 'default' | 'danger';
}

export interface DataTableProps<TData extends Record<string, any> = Record<string, any>> {
    columns: DataTableColumn<TData>[];
    rows: TData[];

    /** Initial page size. Changing this prop after mount has no effect. */
    pageSize?: number;
    pageSizeOptions?: number[];
    /** Set to `false` to disable sorting on every column. */
    sortable?: boolean;
    /** Maximum height (px) of the scroll area. Enables the sticky header. */
    limitHeight?: number;
    /**
     * `column` (default `true`) renders a filter input under every filterable
     * column. `global` (default `false`) renders one search box in the toolbar.
     */
    filter?: {
        global?: boolean;
        column?: boolean;
    };

    /** Stable row id. Required for selection to survive sorting and filtering. */
    getRowId?: (row: TData) => string;
    enableRowSelection?: boolean;
    /** Renders a `...` menu with these actions at the end of every row. */
    rowActions?: DataTableRowAction<TData>[];

    /**
     * Extra toolbar buttons, rendered next to the built-in Column Visibility
     * menu. Pass a function to receive the table instance, which is useful for
     * exporting the rows that are currently filtered and sorted.
     */
    toolbar?: ReactNode | ((table: Table<DataTableFeatures, TData>) => ReactNode);

    emptyMessage?: string;
}