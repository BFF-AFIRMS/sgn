import { useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import type { Table } from '@tanstack/react-table';

import { Button } from '~/@generic';
import { Dropdown, DropdownItem } from '~/@generic/components/Dropdown';
import {
    DataTable,
    type DataTableColumn,
    type DataTableFeatures,
    type DataTableRowAction,
} from '~/datatable';

// TODO: Bring in the edit and delete logic
declare global {
    interface JQuery {
        modal: (action: string) => void;
    }

    interface Window {
        edit_breeding_program: (id: string, name: string, description: string) => void;
        delete_breeding_program: (id: string, name: string) => void;
    }
}

interface BreedingProgram {
    id: string;
    name: string;
    description: string;
}

export interface BreedingProgramsProps {
    /** Rows as sent by the server: `[id, name, description]` tuples. */
    data: string[][];
    isCurator: boolean;
}

type ExportFormat = 'excel' | 'csv' | 'tsv';

const EXPORT_COLUMNS: { key: keyof BreedingProgram; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
];

const escapeDelimited = (value: string, delimiter: string): string =>
    value.includes(delimiter) || value.includes('"') || /[\r\n]/.test(value)
        ? `"${value.replace(/"/g, '""')}"`
        : value;

const downloadFile = (filename: string, content: string, mimeType: string): void => {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Exports the currently selected rows (across every page, not just the one
 * displayed) as Excel, CSV or TSV.
 *
 * TODO: This is a placeholder. I suspect we might want serverside exporting
 * here depending on if we want additional columns not present in this view.
 */
const exportPrograms = (
    format: ExportFormat,
    table: Table<DataTableFeatures, BreedingProgram>,
): void => {
    const rows = table.getSelectedRowModel().rows.map(row => row.original);

    if (format === 'excel') {
		// TODO: Need a writer for this
		alert('Excel export is not implemented yet.');
        return;
    }

    const delimiter = format === 'csv' ? ',' : '\t';
    const content = [
        EXPORT_COLUMNS.map(column => column.label).join(delimiter),
        ...rows.map(row =>
            EXPORT_COLUMNS.map(column => escapeDelimited(row[column.key], delimiter)).join(
                delimiter,
            ),
        ),
    ].join('\r\n');

    downloadFile(
        `breeding_programs.${format}`,
        content,
        format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'text/tab-separated-values;charset=utf-8',
    );
};

export const BreedingProgramsApp: React.FC<BreedingProgramsProps> = ({ data, isCurator }) => {
    const programs = useMemo<BreedingProgram[]>(
        () => data.map(([id, name, description]) => ({ id, name, description })),
        [data],
    );

    const columns = useMemo<DataTableColumn<BreedingProgram>[]>(
        () => [
            { key: 'id', label: 'ID' },
            {
                key: 'name',
                label: 'Name',
                cell: ({ row }) => (
                    <a href={`/breeders/program/${row.original.id}`}>{row.original.name}</a>
                ),
            },
            { key: 'description', label: 'Description' },
        ],
        [],
    );

    const rowActions = useMemo<DataTableRowAction<BreedingProgram>[]>(
        () =>
            isCurator
                ? [
                      {
                          label: 'Edit',
                          onClick: program =>
                              window.edit_breeding_program(
                                  program.id,
                                  program.name,
                                  program.description,
                              ),
                      },
                      {
                          label: 'Delete',
                          variant: 'danger',
                          onClick: program =>
                              window.delete_breeding_program(program.id, program.name),
                      },
                  ]
                : [],
        [isCurator],
    );

    // The table is rendered from server-side data, so refreshing re-requests the page.
    const handleRefresh = useCallback(() => window.location.reload(), []);

    const handleAddProgram = useCallback(() => {
        jQuery('#store_breeding_program_dialog').modal('show');
    }, []);

    const renderToolbar = (table: Table<DataTableFeatures, BreedingProgram>) => (
        <>
            <Dropdown label="Export">
                <DropdownItem onClick={() => exportPrograms('excel', table)}>Excel</DropdownItem>
                <DropdownItem onClick={() => exportPrograms('csv', table)}>CSV</DropdownItem>
                <DropdownItem onClick={() => exportPrograms('tsv', table)}>TSV</DropdownItem>
            </Dropdown>
            <Button onClick={handleRefresh}>Refresh</Button>
            {isCurator && (
                <Button id="new_breeding_program_link" variant="primary" onClick={handleAddProgram}>
                    Add New Program
                </Button>
            )}
        </>
    );

    return (
        <DataTable
            columns={columns}
            rows={programs}
            getRowId={program => program.id}
            rowActions={rowActions}
            filter={{ column: false }}
            toolbar={renderToolbar}
        />
    );
};

export const init = (containerId: string, props: BreedingProgramsProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<BreedingProgramsApp {...props} />);
    }
};