import type { Table } from '@tanstack/react-table';

import { DEFAULT_EXPORT_FORMATS, exportTableData } from '../export';
import type { DataTableFeatures } from '../features';
import type {
    DataTableColumn,
    DataTableExportFormat,
    DataTableExportOptions,
    DataTableProps,
} from '../types';
import { Check } from '~/@generic';
import { Dropdown, DropdownItem, DropdownSeparator } from '~/@generic/components/Dropdown';
import { TextInput } from '~/@generic/components/Input';

const EXPORT_FORMAT_LABELS: Record<DataTableExportFormat, string> = {
    excel: 'Excel',
    csv: 'CSV',
    tsv: 'TSV',
};

interface DataTableToolbarProps<TData extends Record<string, any>> {
    table: Table<DataTableFeatures, TData>;
    columns: DataTableColumn<TData>[];
    toolbar: DataTableProps<TData>['toolbar'];
    exportOptions?: DataTableExportOptions;
    columnLabels: Record<string, string>;
    globalFilter?: {
        value: string;
        onChange: (value: string) => void;
    };
}

export function DataTableToolbar<TData extends Record<string, any>>({
    table,
    columns,
    toolbar,
    exportOptions,
    columnLabels,
    globalFilter,
}: DataTableToolbarProps<TData>) {
    const toolbarContent = typeof toolbar === 'function' ? toolbar(table) : toolbar;

    return (
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between">
            <div className="tw:flex tw:items-center tw:gap-2 tw:flex-wrap tw:mr-2 tw:mb-2">
                <ColumnVisibilityMenu table={table} columnLabels={columnLabels} />
                {exportOptions && (
                    <ExportMenu table={table} columns={columns} options={exportOptions} />
                )}
                {toolbarContent}
            </div>
            {globalFilter && (
                <TextInput
                    type="search"
                    fullWidth={false}
                    className="tw:w-55 tw:mb-2"
                    placeholder="Search all columns..."
                    aria-label="Search all columns"
                    defaultValue={globalFilter.value}
                    onChange={event => globalFilter.onChange(event.target.value)}
                />
            )}
        </div>
    );
}

interface ColumnVisibilityMenuProps<TData extends Record<string, any>> {
    table: Table<DataTableFeatures, TData>;
    columnLabels: Record<string, string>;
}

function ColumnVisibilityMenu<TData extends Record<string, any>>({
    table,
    columnLabels,
}: ColumnVisibilityMenuProps<TData>) {
    const hideableColumns = table.getAllLeafColumns().filter(column => column.getCanHide());

    return (
        <Dropdown label="Column Visibility" closeOnSelect={false}>
            {hideableColumns.length === 0 ? (
                <span className="tw:block tw:px-2 tw:py-1 tw:whitespace-nowrap tw:text-sm tw:text-[#888]">
                    No hideable columns
                </span>
            ) : (
                hideableColumns.map(column => (
                    <DropdownItem
                        key={column.id}
                        role="menuitemcheckbox"
                        aria-checked={column.getIsVisible()}
                        onClick={column.getToggleVisibilityHandler()}
                    >
                        <span className="tw:flex tw:size-4 tw:shrink-0 tw:items-center" aria-hidden="true">
                            {column.getIsVisible() && <Check />}
                        </span>
                        {columnLabels[column.id] ?? column.id}
                    </DropdownItem>
                ))
            )}
        </Dropdown>
    );
}

interface ExportMenuProps<TData extends Record<string, any>> {
    table: Table<DataTableFeatures, TData>;
    columns: DataTableColumn<TData>[];
    options: DataTableExportOptions;
}

function ExportMenu<TData extends Record<string, any>>({
    table,
    columns,
    options,
}: ExportMenuProps<TData>) {
    const formats = options.formats ?? DEFAULT_EXPORT_FORMATS;
    if (formats.length === 0) {
        return null;
    }

    const filteredRows = table.getPrePaginatedRowModel().rows;
    const selectedCount = filteredRows.filter(row => row.getIsSelected()).length;
    const isEmpty = filteredRows.length === 0;

    return (
        <Dropdown label="Export">
            <span className="tw:block tw:px-2 tw:py-1 tw:text-xs tw:text-neutral-500">
                {selectedCount > 0
                    ? `${selectedCount} selected row(s)`
                    : `All ${filteredRows.length} row(s)`}
            </span>
            <DropdownSeparator />
            {formats.map(format => (
                <DropdownItem
                    key={format}
                    disabled={isEmpty}
                    aria-disabled={isEmpty ? 'true' : undefined}
                    onClick={() => void exportTableData(table, columns, format, options)}
                >
                    {EXPORT_FORMAT_LABELS[format]}
                </DropdownItem>
            ))}
        </Dropdown>
    );
}
