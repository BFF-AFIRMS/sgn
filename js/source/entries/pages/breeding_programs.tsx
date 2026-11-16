import { useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from '~/@generic';
import {
    DataTable,
    type DataTableColumn,
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
    data: [number | string, string, string | null][];
    isCurator: boolean;
}

export const BreedingProgramsApp: React.FC<BreedingProgramsProps> = ({ data, isCurator }) => {
    const programs = useMemo<BreedingProgram[]>(
        () =>
            data.map(([id, name, description]) => ({
                id: String(id),
                name: name ?? '',
                description: description ?? '',
            })),
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

    const toolbar = (
        <>
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
            export={{ filename: 'breeding_programs' }}
            toolbar={toolbar}
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