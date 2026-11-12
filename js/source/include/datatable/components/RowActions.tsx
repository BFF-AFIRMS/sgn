import type { DataTableRowAction } from '../types';
import { Ellipses } from '~/@generic';
import { Dropdown, DropdownItem } from '~/@generic/components/Dropdown';

interface DataTableRowActionsProps<TData> {
    actions: DataTableRowAction<TData>[];
    row: TData;
}

export function DataTableRowActions<TData extends Record<string, any>>({
    actions,
    row,
}: DataTableRowActionsProps<TData>) {
    return (
        <Dropdown
            aria-label="Row actions"
            caret={false}
            variant='default-sm'
            label={<Ellipses />}
        >
            {
                actions.map(action => (
                    <DropdownItem
                        key={action.label}
                        onClick={() => action.onClick(row)}
                        variant={action.variant}
                    >
                        {action.label}
                    </DropdownItem>
                ))
            }
        </Dropdown>
    );
}
