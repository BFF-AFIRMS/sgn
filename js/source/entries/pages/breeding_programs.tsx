import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Button } from '~/@generic';
import { Alert } from '~/@generic/components/Alert';
import { storeBreedingProgram, deleteBreedingProgram } from '~/breeding_programs/fetch';
import {
    DataTable,
    type DataTableColumn,
    type DataTableRowAction,
} from '~/datatable';

export interface BreedingProgramsProps {
    /** Rows as sent by the server: `[id, name, description]` tuples. */
    data: [number | string, string, string | null][];
    isCurator: boolean;
}

/**
 * Success messages are handed to the reloaded page through sessionStorage,
 * because storing or deleting a program reloads the page. Session storage is
 * per-tab, so a message never leaks into another tab or a later visit.
 */
const SUCCESS_MESSAGE_KEY = 'breeding_programs_success_message';

interface BreedingProgramDialogProps {
    /** The program being edited, or `null` when creating a new one. */
    program: BreedingProgram | null;
    show: boolean;
    onClose: () => void;
    /** Persists the values. A rejected promise is displayed inside the dialog. */
    onSubmit: (program: BreedingProgram | null, values: BreedingProgramValues) => Promise<void>;
}

/** Create/edit dialog for a breeding program. */
export const BreedingProgramDialog: React.FC<BreedingProgramDialogProps> = ({
    program,
    show,
    onClose,
    onSubmit,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Re-seed the fields whenever the dialog opens, or switches to another program.
    useEffect(() => {
        if (!show) {
            return;
        }
        setName(program?.name ?? '');
        setDescription(program?.description ?? '');
        setError(null);
        setSaving(false);
    }, [show, program]);

    if (!show) {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const trimmedName = name.trim();
        const trimmedDescription = description.trim();
        if (!trimmedName || !trimmedDescription) {
            setError('Please enter a name and a description.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSubmit(program, { name: trimmedName, description: trimmedDescription });
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            id="store_breeding_program_dialog"
            className="modal show tw:block tw:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store_breeding_program_dialog_title"
        >
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <button type="button" className="close" aria-label="Close" onClick={onClose}>
                            &times;
                        </button>
                        <h4 className="modal-title" id="store_breeding_program_dialog_title">
                            {program
                                ? 'Edit Breeding Program Details'
                                : 'Store Breeding Program Details'}
                        </h4>
                    </div>
                    <form id="store_breeding_program_form" onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label
                                    className="control-label"
                                    htmlFor="store_breeding_program_name"
                                >
                                    Name:
                                </label>
                                <input
                                    id="store_breeding_program_name"
                                    className="form-control"
                                    type="text"
                                    value={name}
                                    onChange={event => setName(event.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label
                                    className="control-label"
                                    htmlFor="store_breeding_program_desc"
                                >
                                    Description:
                                </label>
                                <input
                                    id="store_breeding_program_desc"
                                    className="form-control"
                                    type="text"
                                    value={description}
                                    onChange={event => setDescription(event.target.value)}
                                />
                            </div>
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-default"
                                onClick={onClose}
                                disabled={saving}
                            >
                                Close
                            </button>
                            <button
                                id="store_breeding_program_submit"
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                Store Breeding Program Details
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

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

    // Seeded from the message left behind by the reload that follows a store or
    // delete; `null` once there is nothing to confirm.
    const [successMessage, setSuccessMessage] = useState<string | null>(() =>
        sessionStorage.getItem(SUCCESS_MESSAGE_KEY),
    );

    // Consume the message as soon as it has been shown, so revisiting this page
    // in the same tab does not repeat it.
    useEffect(() => {
        sessionStorage.removeItem(SUCCESS_MESSAGE_KEY);
    }, []);

    // `null` closes the dialog; `{ program: null }` opens it in create mode.
    const [dialog, setDialog] = useState<{ program: BreedingProgram | null } | null>(null);

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

    const handleSubmit = useCallback(
        async (program: BreedingProgram | null, values: BreedingProgramValues) => {
            const message = await storeBreedingProgram(program, values);
            sessionStorage.setItem(
                SUCCESS_MESSAGE_KEY,
                message ?? 'The breeding program was stored.',
            );
            // The table is rendered from server-side data, so a reload is what
            // makes the stored program show up.
            window.location.reload();
        },
        [],
    );

    const handleDelete = useCallback(async (program: BreedingProgram) => {
        const confirmed = window.confirm(
            `Delete breeding program ${program.name}? The associated trials will not be deleted, but be listed under 'Other'`,
        );
        if (!confirmed) {
            return;
        }

        try {
            await deleteBreedingProgram(program);
            sessionStorage.setItem(
                SUCCESS_MESSAGE_KEY,
                `Breeding program ${program.name} was deleted.`,
            );
            window.location.reload();
        } catch (e) {
            window.alert(e instanceof Error ? e.message : String(e));
        }
    }, []);

    const rowActions = useMemo<DataTableRowAction<BreedingProgram>[]>(
        () =>
            isCurator
                ? [
                      {
                          label: 'Edit',
                          onClick: program => setDialog({ program }),
                      },
                      {
                          label: 'Delete',
                          variant: 'danger',
                          onClick: program => {
                              void handleDelete(program);
                          },
                      },
                  ]
                : [],
        [isCurator, handleDelete],
    );

    // The table is rendered from server-side data, so refreshing re-requests the page.
    const handleRefresh = useCallback(() => window.location.reload(), []);

    const handleAddProgram = useCallback(() => setDialog({ program: null }), []);

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
        <>
            {successMessage && (
                <Alert
                    id="breeding_program_success_banner"
                    message={successMessage}
                    variant="success"
                    onClose={() => setSuccessMessage(null)}
                />
            )}
            <DataTable
                columns={columns}
                rows={programs}
                getRowId={program => program.id}
                rowActions={rowActions}
                export={{ filename: 'breeding_programs' }}
                toolbar={toolbar}
            />
            <BreedingProgramDialog
                program={dialog?.program ?? null}
                show={dialog !== null}
                onClose={() => setDialog(null)}
                onSubmit={handleSubmit}
            />
        </>
    );
};

export const init = (containerId: string, props: BreedingProgramsProps) => {
    const container = document.getElementById(containerId);
    if (container) {
        const root = createRoot(container);
        root.render(<BreedingProgramsApp {...props} />);
    }
};