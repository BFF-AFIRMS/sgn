import type { Table } from '@tanstack/react-table';

import type { DataTableFeatures } from '../features';
import type { DataTableProps } from '../types';
import { Check } from '~/@generic';
import { Dropdown, DropdownItem } from '~/@generic/components/Dropdown';
import { TextInput } from '~/@generic/components/Input';

interface DataTableToolbarProps<TData extends Record<string, any>> {
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
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between">
            <div className="tw:flex tw:items-center tw:gap-2 tw:flex-wrap tw:mr-2 tw:mb-2">
                <ColumnVisibilityMenu table={table} columnLabels={columnLabels} />
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
